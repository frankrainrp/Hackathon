import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), ts = require('typescript');
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;

test('source deployments isolate their SQLite store; external stores require an explicit path', () => {
  const code = compile(readFileSync(new URL('../src/lib/server-db.ts', import.meta.url), 'utf8'));
  for (const configured of [undefined, resolve('explicit-store/butler.sqlite')]) {
    const opened = [], directories = [], cwd = resolve('synthetic-second-install');
    class Database {
      constructor(path) { opened.push(path); }
      pragma() {} exec() {}
      prepare() { return { get: () => undefined }; }
    }
    const context = { exports: {}, process: { cwd: () => cwd, env: { BUTLER_DB_PATH: configured } }, require: name => {
      if (name === 'server-only') return {};
      if (name === 'better-sqlite3') return Database;
      // Simulate an old drive-root database: it must never be consulted or adopted.
      if (name === 'node:fs') return { mkdirSync: path => directories.push(path), existsSync: () => true };
      if (name === 'node:path') return { resolve, dirname };
      throw Error('Unexpected module ' + name);
    } };
    vm.runInNewContext(code, context); assert.deepEqual(Array.from(context.exports.readState('notes')), []);
    assert.deepEqual(opened, [configured || resolve(cwd, '.private/butler.sqlite')]);
    assert.deepEqual(directories, [dirname(opened[0])]);
  }
});

test('fresh or inaccessible theme settings use Retro while saved choices survive', () => {
  const code = compile(readFileSync(new URL('../src/components/PreferencesPanel.tsx', import.meta.url), 'utf8'));
  for (const [saved, expected] of [[null, 'retro'], ['retro', 'retro'], ['dark', 'dark'], ['light', 'dark'], ['invalid', 'retro']]) {
    const context = { exports: {}, window: {}, localStorage: { getItem: () => saved }, require: () => ({}) };
    vm.runInNewContext(code, context); assert.equal(context.exports.getStoredTheme(), expected);
    context.localStorage.getItem = () => { throw Error('Storage blocked'); };
    assert.equal(context.exports.getStoredTheme(), 'retro');
    delete context.window; assert.equal(context.exports.getStoredTheme(), 'retro');
  }
});
