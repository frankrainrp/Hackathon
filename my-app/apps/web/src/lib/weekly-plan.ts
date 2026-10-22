export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export interface WeeklyPlan {
  profileId: string; enabled: boolean; lastRunAt?: number; nextRunAt?: number;
  result?: "running" | "complete" | "error"; message?: string; missingCount?: number; unknownCount?: number;
}
export function weeklyDue(plan: WeeklyPlan, now = Date.now(), busy = false) {
  return plan.enabled && !busy && (plan.nextRunAt ?? 0) <= now;
}
export function claimWeekly(plan: WeeklyPlan, now = Date.now()): WeeklyPlan {
  return { ...plan, lastRunAt: now, nextRunAt: now + WEEK_MS, result: "running", message: undefined };
}
