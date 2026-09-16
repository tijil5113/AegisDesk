/**
 * Aegis Code Studio — line diff (Myers-inspired LCS) for review UI.
 * Dual-environment. No DOM required.
 */
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.AegisStudio = root.AegisStudio || {};
    root.AegisStudio.diff = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    function splitLines(text) {
        return String(text == null ? '' : text).split('\n');
    }

    function lcsMatrix(a, b) {
        var n = a.length;
        var m = b.length;
        if (n * m > 250000) {
            return null;
        }
        var row = new Array(m + 1);
        var prev = new Array(m + 1);
        var i;
        var j;
        for (j = 0; j <= m; j++) prev[j] = 0;
        var matrix = [prev.slice()];
        for (i = 1; i <= n; i++) {
            row = new Array(m + 1);
            row[0] = 0;
            for (j = 1; j <= m; j++) {
                row[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], row[j - 1]);
            }
            matrix.push(row);
            prev = row;
        }
        return matrix;
    }

    function backtrack(matrix, a, b) {
        var i = a.length;
        var j = b.length;
        var hunks = [];
        while (i > 0 && j > 0) {
            if (a[i - 1] === b[j - 1]) {
                hunks.push({ type: 'equal', text: a[i - 1], oldLine: i, newLine: j });
                i--;
                j--;
            } else if (matrix[i - 1][j] >= matrix[i][j - 1]) {
                hunks.push({ type: 'remove', text: a[i - 1], oldLine: i, newLine: 0 });
                i--;
            } else {
                hunks.push({ type: 'add', text: b[j - 1], oldLine: 0, newLine: j });
                j--;
            }
        }
        while (i > 0) {
            hunks.push({ type: 'remove', text: a[i - 1], oldLine: i, newLine: 0 });
            i--;
        }
        while (j > 0) {
            hunks.push({ type: 'add', text: b[j - 1], oldLine: 0, newLine: j });
            j--;
        }
        hunks.reverse();
        return hunks;
    }

    function coarseDiff(before, after) {
        var a = splitLines(before);
        var b = splitLines(after);
        var hunks = [];
        var max = Math.max(a.length, b.length);
        var i;
        for (i = 0; i < max; i++) {
            if (i >= a.length) hunks.push({ type: 'add', text: b[i], oldLine: 0, newLine: i + 1 });
            else if (i >= b.length) hunks.push({ type: 'remove', text: a[i], oldLine: i + 1, newLine: 0 });
            else if (a[i] === b[i]) hunks.push({ type: 'equal', text: a[i], oldLine: i + 1, newLine: i + 1 });
            else {
                hunks.push({ type: 'remove', text: a[i], oldLine: i + 1, newLine: 0 });
                hunks.push({ type: 'add', text: b[i], oldLine: 0, newLine: i + 1 });
            }
        }
        return hunks;
    }

    function diffLines(before, after) {
        var a = splitLines(before);
        var b = splitLines(after);
        if (a.length === 1 && a[0] === '' && b.join('') === '') {
            return [];
        }
        var matrix = lcsMatrix(a, b);
        if (!matrix) return coarseDiff(before, after);
        return backtrack(matrix, a, b);
    }

    function summarize(hunks) {
        var added = 0;
        var removed = 0;
        var i;
        for (i = 0; i < hunks.length; i++) {
            if (hunks[i].type === 'add') added++;
            if (hunks[i].type === 'remove') removed++;
        }
        return { added: added, removed: removed, changed: added + removed };
    }

    function unified(before, after, path) {
        var hunks = diffLines(before, after);
        var lines = ['--- a/' + (path || 'file'), '+++ b/' + (path || 'file')];
        var i;
        for (i = 0; i < hunks.length; i++) {
            var h = hunks[i];
            if (h.type === 'equal') lines.push(' ' + h.text);
            else if (h.type === 'add') lines.push('+' + h.text);
            else lines.push('-' + h.text);
        }
        return lines.join('\n');
    }

    function applyReplacement(content, oldString, newString) {
        var src = String(content == null ? '' : content);
        var oldS = String(oldString == null ? '' : oldString);
        var newS = String(newString == null ? '' : newString);
        if (!oldS) return { ok: false, error: 'old_string is required for a targeted edit', code: 'invalid_args' };
        var idx = src.indexOf(oldS);
        if (idx < 0) return { ok: false, error: 'Target text was not found. The file may have changed.', code: 'stale' };
        var second = src.indexOf(oldS, idx + oldS.length);
        if (second >= 0) {
            return { ok: false, error: 'Target text is not unique. Provide a larger unique snippet.', code: 'ambiguous' };
        }
        return { ok: true, content: src.slice(0, idx) + newS + src.slice(idx + oldS.length) };
    }

    function hashContent(text) {
        var s = String(text == null ? '' : text);
        var h = 2166136261;
        var i;
        for (i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return (h >>> 0).toString(16);
    }

    return {
        splitLines: splitLines,
        diffLines: diffLines,
        summarize: summarize,
        unified: unified,
        applyReplacement: applyReplacement,
        hashContent: hashContent
    };
});
