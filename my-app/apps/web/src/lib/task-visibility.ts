import type { DdlItem } from "./types";
/** Unknown submission records stay available in All/Courses, not the actionable queue. */
export function isActionableTask(task: DdlItem) {
  return !task.lmsArchived && task.lmsSubmissionState !== "unknown";
}
