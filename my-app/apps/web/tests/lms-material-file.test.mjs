import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { registeredMaterialFile, materialByteRange } from '../src/lib/lms-material-file.ts';

test('local document access requires an exact registered scope and stays inside the actual course output directory', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'butler-documents-'));
  try {
    const root = join(scratch, 'courses'), other = join(scratch, 'private');
    mkdirSync(root); mkdirSync(other);
    const pdf = join(root, 'slides.pdf'); writeFileSync(pdf, '%PDF-1.7\nSynthetic document');
    const secret = join(other, 'private.pdf'); writeFileSync(secret, '%PDF-private-synthetic');
    const fake = join(root, 'fake.pdf'); writeFileSync(fake, '<html>not a PDF</html>');
    symlinkSync(other, join(root, 'link'), 'junction');
    const selector = { profile: 'rp', semester: '26S2', course: '7', material: 'slides' };
    const course = { id: '7', profileId: 'rp', semesterId: '26S2', lessons: [{ materials: [{ id: 'slides', filePath: pdf }] }] };
    assert.equal(registeredMaterialFile(root, [course], selector).pdf, true);
    assert.equal(registeredMaterialFile(root, [course], { ...selector, semester: '25S2' }), null);
    assert.equal(registeredMaterialFile(root, [course], { ...selector, profile: 'other' }), null);
    for (const filePath of [secret, join(root, 'link/private.pdf'), root, join(root, 'missing.pdf')]) {
      const altered = { ...course, lessons: [{ materials: [{ id: 'slides', filePath }] }] };
      assert.equal(registeredMaterialFile(root, [altered], selector), null);
    }
    course.lessons[0].materials[0].filePath = fake;
    assert.equal(registeredMaterialFile(root, [course], selector).pdf, false, 'Renamed HTML must never be served inline as a document');
  } finally { rmSync(scratch, { recursive: true, force: true }); }
});

test('PDF byte ranges support native seeking and reject invalid or multiple ranges', () => {
  assert.deepEqual(materialByteRange(null, 100), { start: 0, end: 99, partial: false });
  assert.deepEqual(materialByteRange('bytes=0-4', 100), { start: 0, end: 4, partial: true });
  assert.deepEqual(materialByteRange('bytes=90-', 100), { start: 90, end: 99, partial: true });
  assert.deepEqual(materialByteRange('bytes=-10', 100), { start: 90, end: 99, partial: true });
  for (const value of ['bytes=100-', 'bytes=5-2', 'bytes=-0', 'bytes=0-1,5-6', 'bytes=-', 'items=0-5']) assert.equal(materialByteRange(value, 100), null);
  assert.equal(materialByteRange('bytes=0-', 0), null);
});
