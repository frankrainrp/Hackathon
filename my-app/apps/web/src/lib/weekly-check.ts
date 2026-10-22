import { readState, writeState, readLmsFeed } from "./server-db";
import { readProfiles } from "./lms-profile-store";
import { activeProfile, supportsSchoolConnection } from "./lms-profile";
import { schoolJob, startSchoolDiscovery } from "./lms-worker";
import { weeklyDue, claimWeekly, type WeeklyPlan } from "./weekly-plan";
import { uiText } from "./messages";

const KEY = "weekly-school-checks";
const plans = () => readState(KEY) as WeeklyPlan[];
function store(plan: WeeklyPlan) { writeState(KEY, plans().filter(p => p.profileId !== plan.profileId).concat(plan)); }
export function weeklyStatus(): WeeklyPlan {
  const id = readProfiles().activeProfileId || "";
  return plans().find(p => p.profileId === id) || { profileId: id, enabled: false };
}
export function configureWeekly(enabled: boolean) {
  const profile = activeProfile(readProfiles());
  if (!profile || !supportsSchoolConnection(profile.domain, profile.platform)) throw new Error(uiText("school.auto.connectionUnsupported"));
  const old = weeklyStatus();
  const plan = { ...old, enabled, nextRunAt: enabled && !old.enabled ? Date.now() : old.nextRunAt };
  store(plan);
  return plan;
}
/** Never opens a login window, downloads files, or calls a cloud summary. */
export function maybeStartWeekly(force = false) {
  const plan = weeklyStatus();
  const busy = schoolJob()?.state === "running";
  if (!plan.enabled || busy || !force && !weeklyDue(plan)) return plan;
  const profile = activeProfile(readProfiles());
  const semester = profile?.semesters.find(s => s.id === profile.activeSemesterId);
  if (!profile || !semester?.confirmed) return plan;
  const claimed = claimWeekly(plan);
  store(claimed);
  try {
    startSchoolDiscovery(false, false, { allActive: true, onSettled: job => {
      const current = plans().find(p => p.profileId === plan.profileId) || claimed;
      const feed = readLmsFeed();
      const missingCount = (feed.courses || []).filter(c => c.profileId === plan.profileId && !c.archived)
        .flatMap(c => c.assignments).filter(a => a.submissionState === "missing").length;
      const unknownCount = (feed.courses || []).filter(c => c.profileId === plan.profileId && !c.archived)
        .flatMap(c => c.assignments).filter(a => a.submissionState === "unknown").length;
      store({ ...current, result: job.state === "complete" ? "complete" : "error", message: job.message, missingCount, unknownCount });
    } });
  } catch (error) {
    store({ ...claimed, result: "error", message: error instanceof Error ? error.message : uiText("school.auto.workerFailed") });
  }
  return weeklyStatus();
}
