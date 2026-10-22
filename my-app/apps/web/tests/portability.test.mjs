import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { auditFiles, scrubBuildPaths } = require('../../../../tools/portable-paths.cjs');

test('release audit catches actual machine configuration without altering upstream compiler metadata', () => {
  const folder = mkdtempSync(join(tmpdir(), 'butler-portability-'));
  try {
    const vendor = join(folder, 'ops/lms-sync/_internal/vendor.dll');
    mkdirSync(join(folder, 'ops/lms-sync/_internal'), { recursive: true });
    writeFileSync(vendor, homedir() + '\\AppData\\Local\\Temp\\python-build-fixture\\Modules\\example.c\0');
    const metadata = auditFiles(folder, [vendor], process.cwd());
    assert.deepEqual(metadata.findings, []);
    assert.equal(metadata.vendorBuildMetadata.length, 1);
    writeFileSync(vendor, homedir() + '\\private-models\\weights.bin\0');
    assert.equal(auditFiles(folder, [vendor], process.cwd()).findings[0].rule, 'build-machine-path');
    const privateFile = join(folder, 'config.local.json');
    writeFileSync(privateFile, '{}');
    assert.equal(auditFiles(folder, [privateFile], process.cwd()).findings[0].rule, 'private-state-or-weights');
  } finally { rmSync(folder, { recursive: true, force: true }); }
});

test('compiled application symbols are scrubbed consistently and runtime tracing follows the package', () => {
  const folder = mkdtempSync(join(tmpdir(), 'butler-relocate-'));
  try {
    const app = join(folder, 'app/apps/web'); mkdirSync(app, { recursive: true });
    const server = join(app, 'server.js');
    writeFileSync(server, 'const nextConfig = '+JSON.stringify({outputFileTracingRoot:process.cwd()})+'\nconst symbol='+JSON.stringify(process.cwd()+'/src/page.tsx')+';');
    scrubBuildPaths(folder, process.cwd());
    const text = readFileSync(server, 'utf8');
    assert.ok(!text.includes(process.cwd().replaceAll('\\', '\\\\')));
    assert.match(text, /__dirname, "\.\.\/\.\."/);
    assert.match(text, /butler-source/);
  } finally { rmSync(folder, { recursive: true, force: true }); }
});
