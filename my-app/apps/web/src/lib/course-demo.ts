
import { uiText } from "./messages.ts";
import type { LmsCourse } from "./lms-sync";

/** Fictional public demo. Never contains a student's school records. */
export const demoCourses = (): LmsCourse[] => [
  ["C101", uiText("ui.coursedemo.426e6a8784")], ["C102", uiText("ui.coursedemo.213f16fc34")],
  ["C103", uiText("ui.coursedemo.c3478ede78")], ["C104", uiText("ui.coursedemo.e51d20cb9c")],
  ["C105", uiText("ui.coursedemo.2dc8b8ba90")], ["C106", uiText("ui.coursedemo.650314e6ff")], ["C107", uiText("ui.coursedemo.148e0d7d3b")],
].map(([id, name], index) => ({
  id, moduleName: `${id} ${name}`, school: uiText("ui.coursedemo.fa9a12e698"), noteId: `demo-${id}`,
  lessons: [{ id: `${id}-lesson-1`, number: 1, title: uiText("ui.coursedemo.eac2550712"), materials: [{
    id: `${id}-reading`, title: uiText("ui.coursedemo.1a2c998f91"), url: "https://example.com/demo-course",
    textStatus: "ready", text: index === 0
      ? uiText("ui.coursedemo.37529c84f6")
      : uiText("ui.coursedemo.5ab2d985e4", { value0: name }),
  }] }],
  assignments: Array.from({ length: index === 6 ? 0 : 4 }, (_, task) => ({
    id: `${id}-task-${task}`, title: uiText("ui.coursedemo.ad76fa0974", { value0: task + 1 }), dueAt: null,
    url: "https://example.com/demo-course", submissionState: task < index % 4 ? "submitted" as const : task === 3 ? "unknown" as const : "missing" as const,
  })), announcements: [],
}));
