import type { LmsCourse } from "./lms-sync";

/** Fictional public demo. Never contains a student's school records. */
export const demoCourses: LmsCourse[] = [
  ["C101", "Programming Fundamentals"], ["C102", "Design Principles"],
  ["C103", "Web Application Development"], ["C104", "DevOps Foundations"],
  ["C105", "AI Essentials"], ["C106", "Data Analytics"], ["C107", "Portfolio Studio"],
].map(([id, name], index) => ({
  id, moduleName: `${id} ${name}`, school: "Demo College", noteId: `demo-${id}`,
  lessons: [{ id: `${id}-lesson-1`, number: 1, title: "Foundations / 基础", materials: [{
    id: `${id}-reading`, title: "Demo study notes / 示例学习笔记", url: "https://example.com/demo-course",
    textStatus: "ready", text: index === 0
      ? "This is a fictional demo lesson. A variable stores a value. A loop repeats instructions. A function groups reusable instructions. The demo experiment named Willow returned 37 successful runs out of 50, a success rate of 74%. 示例课次：变量存储值，循环重复指令，函数封装可复用指令。Willow 示例实验在50次运行中成功37次，成功率74%。"
      : `This is a fictional demonstration lesson for ${name}. Study one concept, explain it in your own words, then practise with a small example. 这是 ${name} 的示例课次：先学习一个概念，再用自己的话解释，最后用小例子练习。`,
  }] }],
  assignments: Array.from({ length: index === 6 ? 0 : 4 }, (_, task) => ({
    id: `${id}-task-${task}`, title: `Demo exercise ${task + 1}`, dueAt: null,
    url: "https://example.com/demo-course", submissionState: task < index % 4 ? "submitted" as const : task === 3 ? "unknown" as const : "missing" as const,
  })), announcements: [],
}));
