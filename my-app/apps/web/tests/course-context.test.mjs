import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectCourseContext, wantsCourseContext, sourceLinksMarkdown } from '../src/lib/course-context.ts';
import { courseCopy } from '../src/lib/course-copy.ts';

const course = (id, text) => ({ id, noteId: id, moduleName: id, school: 'Synthetic school',
  lessons: [{ id: 'lesson', number: 1, title: 'Experiment', materials: [{ id: 'file', title: 'Evidence', url: 'https://example.com/material', text, textStatus: 'ready' }] }], assignments: [] });

test('ordinary chat recognises a course code or full title without a manual course scope', () => {
  const feed = { courses: [{ ...course('c304', 'SSR source'), moduleName: 'C304 Cloud Application Development' },
    { ...course('c305', 'Other private text'), moduleName: 'C305 Development Project' }] };
  for (const question of ['Explain C304 SSR', 'Summarise cloud application development']) {
    assert.equal(wantsCourseContext(feed, question), true);
    assert.deepEqual(selectCourseContext(feed, question).courses, ['C304 Cloud Application Development']);
  }
  assert.equal(wantsCourseContext(feed, 'Explain C3040'), false);
  const context = selectCourseContext(feed, 'C304');
  context.sources.push(context.sources[0]);
  const markdown = sourceLinksMarkdown(context);
  assert.match(markdown, /\[C304.*\]\(https:\/\/example.com\/material\)/);
  assert.equal((markdown.match(/https:\/\/example.com\/material/g) || []).length, 1);
  assert.equal(sourceLinksMarkdown({ sources: [{ label: 'Unsafe', url: 'javascript:alert(1)' }] }), '');
});
test('retrieves late passages without leaking another course into the selected scope', () => {
  const feed = { courses: [course('alpha', 'Ordinary introduction. '.repeat(140) + 'Willow: 37 successes in 50 trials.'), course('beta', 'Private beta result is 99%.')] };
  const result = selectCourseContext(feed, 'Willow trials', 'alpha');
  assert.match(result.sources[0].excerpt, /37 successes/);
  assert.ok(result.sources.every(s => !s.excerpt.includes('Private beta')));
  assert.deepEqual(selectCourseContext(feed, 'Willow', 'missing').sources, []);
  assert.equal(result.sources[0].url, 'https://example.com/material');
});
test('reports missing text and supports fictional demo without school records', () => {
  assert.equal(selectCourseContext({ courses: [course('alpha', '')] }, '', 'alpha').missingText, 1);
  const demo = selectCourseContext({ courses: [] }, 'variable', 'demo-C101');
  assert.match(demo.sources[0].excerpt, /fictional practice lesson/);
  assert.match(demo.sources[0].excerpt, /not a school record/);
  assert.doesNotMatch(demo.sources[0].excerpt, /Willow|74%/);
  assert.equal(demo.courses.length, 1);
});
test('course interface has matching Chinese and English keys', () => {
  assert.deepEqual(Object.keys(courseCopy.zh).sort(), Object.keys(courseCopy.en).sort());
  assert.ok(Object.values(courseCopy.en).every(value => typeof value === 'string' && value.length));
});
