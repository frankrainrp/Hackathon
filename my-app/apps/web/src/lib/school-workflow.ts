export type SchoolAction = "login" | "catalog" | "inspect" | "sync";

/** Discover the real term first, then import metadata for the confirmed selection. */
export async function runSchoolWorkflow(options: {
  login: boolean;
  download?: boolean;
  run(action: SchoolAction): Promise<void>;
  discover(): Promise<boolean>;
  canContinue(): boolean;
  hasSelectedCourses(): boolean;
}) {
  const check = () => { if (!options.canContinue()) throw new Error(uiText("school.auto.stopped")); };
  if (options.login) await options.run("login");
  check(); await options.run("catalog");
  check(); const found = await options.discover();
  check(); if (!found) return "termUnavailable";
  if (!options.hasSelectedCourses()) return "noSelectedCourses";
  await options.run(options.download ? "sync" : "inspect"); check();
  return options.download ? "downloaded" : "complete";
}
import { uiText } from "./messages.ts";
