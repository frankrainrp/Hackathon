"use strict";

// Isolated regression checks against the actual NoteEditor component source.
// No browser, server, application imports, disk writes, or user data are used.
// Run: node --test tests/notes-editor.test.mjs from apps/web.
// This is a small hook/timer harness, not a replacement for React/browser QA.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { test } from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const checkout = fileURLToPath(new URL("../../../../", import.meta.url));
const sourcePath = path.join(checkout, "my-app/apps/web/src/components/NotesPanel.tsx");
const ts = require(path.join(checkout, "my-app/node_modules/typescript"));
const source = readFileSync(sourcePath, "utf8") + "\nexport const auditNoteEditor = NoteEditor;\n";
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.React,
    esModuleInterop: true,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

function syntheticNote(id = "note-a") {
  return { id, title: "Original title", content: "Original content", pinned: false, createdAt: 1, updatedAt: 1 };
}

function childrenOf(node) {
  return (node?.children || []).flat(Infinity).filter(Boolean);
}

function find(node, predicate) {
  if (!node || typeof node !== "object") return null;
  if (predicate(node)) return node;
  for (const child of childrenOf(node)) {
    const match = find(child, predicate);
    if (match) return match;
  }
  return null;
}

function mountEditor(initial = syntheticNote()) {
  let stored = { ...initial };
  let hooks = [], cursor = 0, pendingEffects = [], tree;
  let dirty = true, mounted = true, now = 0, timerId = 0;
  const timers = new Map();
  const updates = [];
  const sameDependencies = (a, b) => !!a && !!b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));

  function state(initialValue) {
    const index = cursor++;
    if (!(index in hooks)) hooks[index] = { value: typeof initialValue === "function" ? initialValue() : initialValue };
    return [hooks[index].value, value => {
      if (!mounted) return;
      const next = typeof value === "function" ? value(hooks[index].value) : value;
      if (!Object.is(hooks[index].value, next)) {
        hooks[index].value = next;
        dirty = true;
      }
    }];
  }

  function effect(create, dependencies) {
    const index = cursor++;
    const previous = hooks[index];
    if (!previous || !sameDependencies(previous.dependencies, dependencies)) {
      pendingEffects.push({ index, previous, create, dependencies });
    }
  }

  function memo(factory, dependencies) {
    const index = cursor++;
    if (!hooks[index] || !sameDependencies(hooks[index].dependencies, dependencies)) {
      hooks[index] = { value: factory(), dependencies };
    }
    return hooks[index].value;
  }

  const React = {
    Fragment: "fragment",
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState: state,
    useEffect: effect,
    useLayoutEffect: effect,
    useMemo: memo,
    useCallback: (callback, dependencies) => memo(() => callback, dependencies),
    useRef: value => {
      const index = cursor++;
      if (!hooks[index]) hooks[index] = { current: value };
      return hooks[index];
    },
  };

  function onUpdate(patch) {
    updates.push({ ...patch });
    stored = { ...stored, ...patch };
    dirty = true;
  }

  const exported = {};
  const sandbox = {
    exports: exported,
    console,
    Date,
    setTimeout: (callback, delay = 0) => {
      const id = ++timerId;
      timers.set(id, { callback, due: now + delay });
      return id;
    },
    clearTimeout: id => timers.delete(id),
    require: id => {
      if (id === "react") return React;
      if (id === "@/lib/i18n") return { useT: () => ({ lang: "en" }) };
      if (id === "@/lib/messages") return { uiText: key => key };
      if (id === "@/lib/use-is-mobile") return { useIsMobile: () => false };
      // Other imports supply presentation nodes; their components are not invoked.
      return new Proxy({}, { get: (_target, key) => key });
    },
  };
  vm.runInNewContext(compiled, sandbox, { filename: sourcePath });

  function flush() {
    if (!mounted) return;
    let passes = 0;
    while (dirty) {
      assert.ok(++passes <= 30, "Hook harness detected an update loop");
      dirty = false;
      cursor = 0;
      pendingEffects = [];
      tree = exported.auditNoteEditor({
        note: { ...stored },
        mode: "edit",
        onModeChange: () => {},
        onUpdate,
        onDelete: () => {},
      });
      const effects = pendingEffects;
      // React cleans up changed passive effects before creating the new effects.
      for (const item of effects) item.previous?.cleanup?.();
      for (const item of effects) {
        hooks[item.index] = { dependencies: item.dependencies, cleanup: item.create() };
      }
    }
  }

  function field(type) {
    const node = find(tree, item => item.type === type);
    assert.ok(node, `Actual NoteEditor must contain a ${type}`);
    return node;
  }

  function edit(type, value) {
    field(type).props.onChange({ target: { value } });
    flush();
  }

  function pin() {
    const button = find(tree, item => item.type === "button" &&
      ["ui.notespanel.173f88d28e", "ui.notespanel.c92179b74a"].includes(item.props["aria-label"]));
    assert.ok(button, "Actual NoteEditor must expose its pin/unpin button");
    button.props.onClick();
    flush(); // Feed the updated parent note props back into the real component.
  }

  function advance(milliseconds) {
    const target = now + milliseconds;
    let iterations = 0;
    while (true) {
      const next = [...timers].filter(([, timer]) => timer.due <= target).sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      assert.ok(++iterations <= 100, "Hook harness detected a timer loop");
      now = next[1].due;
      timers.delete(next[0]);
      next[1].callback();
      flush();
    }
    now = target;
  }

  function unmount() {
    mounted = false;
    for (const hook of hooks) hook?.cleanup?.();
  }

  flush();
  return {
    editContent: value => edit("textarea", value),
    editTitle: value => edit("input", value),
    visibleContent: () => field("textarea").props.value,
    pin, advance, unmount,
    stored: () => ({ ...stored }),
    updates: () => updates.map(patch => ({ ...patch })),
  };
}

test("last title and content survive leaving Notes before the debounce fires", () => {
  const editor = mountEditor();
  editor.editTitle("Last title before navigation");
  editor.editContent("Last content before navigation");
  editor.advance(100);
  editor.unmount();
  editor.advance(1000);
  assert.equal(editor.stored().title, "Last title before navigation", "Unmount must flush the final title");
  assert.equal(editor.stored().content, "Last content before navigation", "Unmount must flush the final content");
});

test("switching keyed note editors saves the first note without modifying the second", () => {
  const first = mountEditor(syntheticNote("note-a"));
  first.editContent("Note A final draft");
  first.advance(100);
  first.unmount(); // NotesPanel uses key={active.id}, so note switching unmounts it.
  const second = mountEditor(syntheticNote("note-b"));
  first.advance(1000);
  assert.equal(first.stored().content, "Note A final draft", "Switching notes must save the old editor's draft");
  assert.equal(second.stored().content, "Original content", "The draft must remain scoped to note A");
  second.unmount();
});

test("pinning updates parent props without resetting an in-progress draft", () => {
  const editor = mountEditor();
  editor.editContent("Draft survives pin props update");
  editor.pin();
  assert.equal(editor.stored().pinned, true, "The pin event must update parent state");
  assert.equal(editor.visibleContent(), "Draft survives pin props update", "Parent metadata updates must not reset the visible draft");
  editor.advance(1000);
  assert.equal(editor.stored().content, "Draft survives pin props update", "The draft must eventually save");
  assert.equal(editor.stored().pinned, true, "Saving a draft must preserve the latest pin state");
  editor.unmount();
});

test("pinning and immediately leaving preserves both the final draft and parent metadata", () => {
  const editor = mountEditor();
  editor.editContent("Draft survives pin then navigation");
  editor.pin();
  assert.equal(editor.visibleContent(), "Draft survives pin then navigation", "The pin props update must preserve the visible draft");
  editor.advance(100);
  editor.unmount();
  editor.advance(1000);
  assert.equal(editor.stored().content, "Draft survives pin then navigation", "Leaving after pinning must save the final draft");
  assert.equal(editor.stored().pinned, true, "A flush must not overwrite newer parent metadata");
});
