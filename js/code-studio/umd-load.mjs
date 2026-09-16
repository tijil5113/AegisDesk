import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));

const sandbox = {
  console,
  module: { exports: {} },
  exports: {}
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

export function loadStudioUmd(filename) {
  const file = path.join(dir, filename);
  const code = fs.readFileSync(file, 'utf8');
  sandbox.module = { exports: {} };
  sandbox.exports = sandbox.module.exports;
  vm.runInContext(code, sandbox, { filename: file });
  return sandbox.module.exports && Object.keys(sandbox.module.exports).length
    ? sandbox.module.exports
    : (sandbox.AegisStudio && sandbox.AegisStudio[filename.replace(/\.js$/, '')]) || sandbox.module.exports;
}

export function studioNamespace() {
  return sandbox.AegisStudio || {};
}
