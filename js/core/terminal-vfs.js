/**
 * Terminal Virtual File System - IndexedDB backed, persistent.
 * Supports: ls, cd, pwd, mkdir, touch, rm, mv, cp, cat
 */

const TERMINAL_VFS_DB = 'AegisDeskTerminalVFS';
const TERMINAL_VFS_VERSION = 1;
const STORE_NAME = 'files';

function normalizePath(cwd, pathArg) {
    if (!pathArg || pathArg === '~') return '/home/user';
    let p = pathArg.startsWith('/') ? pathArg : (cwd + '/' + pathArg).replace(/\/+/g, '/');
    const parts = [];
    for (const part of p.split('/')) {
        if (part === '' || part === '.') continue;
        if (part === '..') {
            parts.pop();
            continue;
        }
        parts.push(part);
    }
    return '/' + parts.join('/') || '/';
}

class TerminalVFS {
    constructor() {
        this.db = null;
        this.ready = this.init();
    }

    async init() {
        return new Promise((resolve) => {
            const req = indexedDB.open(TERMINAL_VFS_DB, TERMINAL_VFS_VERSION);
            req.onerror = () => resolve();
            req.onsuccess = () => {
                this.db = req.result;
                resolve();
            };
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'path' });
                    store.createIndex('parent', 'parent', { unique: false });
                }
                // Seed root and home
                const tx = e.target.transaction;
                const st = tx.objectStore(STORE_NAME);
                st.put({ path: '/', type: 'dir', parent: '', created: Date.now(), updated: Date.now() });
                st.put({ path: '/home', type: 'dir', parent: '/', created: Date.now(), updated: Date.now() });
                st.put({ path: '/home/user', type: 'dir', parent: '/home', created: Date.now(), updated: Date.now() });
            };
        });
    }

    async _get(path) {
        if (!this.db) return null;
        return new Promise((resolve) => {
            const tx = this.db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(path);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    }

    async _put(entry) {
        if (!this.db) return false;
        return new Promise((resolve) => {
            const tx = this.db.transaction(STORE_NAME, 'readwrite');
            const st = tx.objectStore(STORE_NAME);
            st.put(entry);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    }

    async _delete(path) {
        if (!this.db) return false;
        return new Promise((resolve) => {
            const tx = this.db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(path);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    }

    async _all() {
        if (!this.db) return [];
        return new Promise((resolve) => {
            const tx = this.db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    }

    async ls(cwd, pathArg) {
        await this.ready;
        const dir = pathArg ? normalizePath(cwd, pathArg) : cwd;
        const entry = await this._get(dir);
        if (!entry || entry.type !== 'dir') return null;
        const all = await this._all();
        const children = all.filter(e => e.parent === dir).map(e => ({
            name: e.path.split('/').pop() || e.path,
            type: e.type,
            path: e.path
        }));
        children.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        return children;
    }

    async mkdir(cwd, pathArg) {
        await this.ready;
        const full = normalizePath(cwd, pathArg);
        if (full === '/' || full === '/home' || full === '/home/user') return false;
        const existing = await this._get(full);
        if (existing) return existing.type === 'dir';
        const parent = full.split('/').slice(0, -1).join('/') || '/';
        const parentEntry = await this._get(parent);
        if (!parentEntry || parentEntry.type !== 'dir') return false;
        await this._put({
            path: full,
            type: 'dir',
            parent,
            created: Date.now(),
            updated: Date.now()
        });
        return true;
    }

    async touch(cwd, pathArg) {
        await this.ready;
        const full = normalizePath(cwd, pathArg);
        const existing = await this._get(full);
        if (existing) {
            if (existing.type === 'dir') return false;
            existing.updated = Date.now();
            await this._put(existing);
            return true;
        }
        const parent = full.split('/').slice(0, -1).join('/') || '/';
        const parentEntry = await this._get(parent);
        if (!parentEntry || parentEntry.type !== 'dir') return false;
        await this._put({
            path: full,
            type: 'file',
            parent,
            content: '',
            created: Date.now(),
            updated: Date.now()
        });
        return true;
    }

    async cat(cwd, pathArg) {
        await this.ready;
        const full = normalizePath(cwd, pathArg);
        const entry = await this._get(full);
        if (!entry) return null;
        if (entry.type === 'dir') return { dir: true };
        return { content: entry.content || '' };
    }

    async writeFile(cwd, pathArg, content) {
        await this.ready;
        const full = normalizePath(cwd, pathArg);
        const parent = full.split('/').slice(0, -1).join('/') || '/';
        let entry = await this._get(full);
        if (entry && entry.type === 'dir') return false;
        const parentEntry = await this._get(parent);
        if (!parentEntry || parentEntry.type !== 'dir') return false;
        const now = Date.now();
        if (!entry) {
            entry = { path: full, type: 'file', parent, content: '', created: now, updated: now };
        }
        entry.content = content;
        entry.updated = now;
        await this._put(entry);
        return true;
    }

    async rm(cwd, pathArg, recursive = false) {
        await this.ready;
        const full = normalizePath(cwd, pathArg);
        if (full === '/' || full === '/home' || full === '/home/user') return false;
        const entry = await this._get(full);
        if (!entry) return false;
        if (entry.type === 'dir') {
            const all = await this._all();
            const children = all.filter(e => e.path.startsWith(full + '/'));
            if (children.length > 0 && !recursive) return null;
            for (const c of children.sort((a, b) => b.path.length - a.path.length)) {
                await this._delete(c.path);
            }
        }
        await this._delete(full);
        return true;
    }

    async mv(cwd, fromArg, toArg) {
        await this.ready;
        const from = normalizePath(cwd, fromArg);
        const to = normalizePath(cwd, toArg);
        if (from === to) return true;
        const fromEntry = await this._get(from);
        if (!fromEntry) return false;
        const all = await this._all();
        let destPath = to;
        const toEntry = await this._get(to);
        if (toEntry) {
            if (toEntry.type === 'dir') destPath = to + '/' + from.split('/').pop();
            else return false;
        }
        const toParent = destPath.split('/').slice(0, -1).join('/') || '/';
        const toParentEntry = await this._get(toParent);
        if (!toParentEntry || toParentEntry.type !== 'dir') return false;

        if (fromEntry.type === 'file') {
            fromEntry.path = destPath;
            fromEntry.parent = toParent;
            fromEntry.updated = Date.now();
            await this._put(fromEntry);
            return true;
        }

        const children = all.filter(e => e.path.startsWith(from + '/')).sort((a, b) => a.path.length - b.path.length);
        const newEntries = [];
        for (const c of children) {
            const rel = c.path.slice(from.length);
            const newPath = destPath + rel;
            newEntries.push({ ...c, path: newPath, parent: newPath.split('/').slice(0, -1).join('/') || '/', updated: Date.now() });
        }
        const newDir = { ...fromEntry, path: destPath, parent: toParent, updated: Date.now() };
        await this._put(newDir);
        for (const e of newEntries) {
            await this._put(e);
        }
        for (const c of all.filter(e => e.path.startsWith(from + '/')).sort((a, b) => b.path.length - a.path.length)) {
            await this._delete(c.path);
        }
        await this._delete(from);
        return true;
    }

    async cp(cwd, fromArg, toArg) {
        await this.ready;
        const from = normalizePath(cwd, fromArg);
        let to = normalizePath(cwd, toArg);
        const fromEntry = await this._get(from);
        if (!fromEntry) return false;
        const toEntry = await this._get(to);
        if (toEntry) {
            if (toEntry.type === 'dir') to = to + '/' + from.split('/').pop();
            else return false;
        }
        const toParent = to.split('/').slice(0, -1).join('/') || '/';
        const toParentEntry = await this._get(toParent);
        if (!toParentEntry || toParentEntry.type !== 'dir') return false;

        const self = this;
        async function copyOne(srcPath, destPath) {
            const entry = await self._get(srcPath);
            if (!entry) return;
            const newEntry = {
                path: destPath,
                type: entry.type,
                parent: destPath.split('/').slice(0, -1).join('/') || '/',
                content: entry.type === 'file' ? (entry.content || '') : undefined,
                created: Date.now(),
                updated: Date.now()
            };
            await self._put(newEntry);
            if (entry.type === 'dir') {
                const all = await self._all();
                const children = all.filter(e => e.parent === srcPath);
                for (const c of children) {
                    await copyOne(c.path, destPath + '/' + c.path.split('/').pop());
                }
            }
        }
        await copyOne(from, to);
        return true;
    }

    pathExists(cwd, pathArg) {
        const full = normalizePath(cwd, pathArg);
        return this._get(full).then(e => !!e);
    }
}

if (typeof window !== 'undefined') {
    window.TerminalVFS = TerminalVFS;
}
