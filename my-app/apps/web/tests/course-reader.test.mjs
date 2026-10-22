import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readerSections, compactSourceTitle, firstReadingMaterial, materialFileUrl } from '../src/lib/course-reader.ts';

test('lesson reader keeps actual lessons separate from week-level supporting pages without dropping content', () => {
  const lessons = [{ id: 'week1', kind: 'Week', number: 1, materials: [{ id: 'submission' }] },
    { id: 'lesson1', kind: 'Lesson', number: 1, materials: [{ id: 'slides' }] },
    { id: 'lesson2', kind: 'Lesson', number: 2, materials: [{ id: 'resources' }] },
    { id: 'other', number: null, materials: [{ id: 'guide' }] }];
  const result = readerSections(lessons);
  assert.deepEqual(result.primary.map(l => l.id), ['lesson1', 'lesson2']);
  assert.deepEqual(result.supporting.map(l => l.id), ['week1', 'other']);
  assert.equal([...result.primary, ...result.supporting].flatMap(l => l.materials).length, 4);
  assert.deepEqual(readerSections([lessons[0]]).primary, [lessons[0]], 'Weekly teaching remains the primary navigation when there are no lesson folders');
});

test('document labels remove repeated course/week/lesson prefixes while keeping original records intact', () => {
  assert.equal(compactSourceTitle('C346_Week01_Lesson01_Slides'), 'Slides');
  assert.equal(compactSourceTitle('C346 Week 01 Lesson 01 Student Resources'), 'Student Resources');
  assert.equal(compactSourceTitle('C346 Week 01 Lesson 01'), '');
  assert.equal(compactSourceTitle('Setting Up a React Project'), 'Setting Up a React Project');
  const materials = [{ id: 'zip', title: 'Resources', text: 'Available text' }, { id: 'pdf', filePath: '/saved/slides.pdf' }];
  assert.equal(firstReadingMaterial(materials).id, 'pdf');
  const course = { id: '7', profileId: 'school-a', semesterId: '26S2' };
  const url = new URL(materialFileUrl(course, materials[1]), 'http://127.0.0.1');
  assert.equal(url.searchParams.get('semester'), '26S2');
  assert.equal(url.searchParams.get('material'), 'pdf');
  assert.equal(url.searchParams.has('path'), false);
  assert.equal(materialFileUrl({ id: '7' }, materials[1]), null);
  assert.equal(materials[1].filePath, '/saved/slides.pdf');
});
