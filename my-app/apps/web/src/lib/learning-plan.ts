export const DAY_MS = 24 * 60 * 60 * 1000;
export interface LearningPlan {
  profileId:string; enabled:boolean; downloadSelected:boolean; requiresLogin?:boolean;
  lastRunAt?:number; nextRunAt?:number; lastSuccessfulAt?:number;
  result?:'running'|'complete'|'error'; message?:string;
}
export function configureLearningPlan(old:LearningPlan|undefined,profileId:string,enabled:boolean,now=Date.now()):LearningPlan {
  return {...old,profileId,enabled,downloadSelected:true,nextRunAt:enabled&&!old?.enabled?now:old?.nextRunAt};
}
export function learningPlanDue(plan:LearningPlan,now=Date.now(),busy=false) {
  // Retry an interrupted claim when no worker remains after a restart.
  return plan.enabled && !plan.requiresLogin && !busy && (plan.result==='running'||(plan.nextRunAt??0)<=now);
}
export function claimLearningPlan(plan:LearningPlan,now=Date.now()):LearningPlan {
  return {...plan,lastRunAt:now,nextRunAt:now+DAY_MS,result:'running',message:undefined};
}
export function finishLearningPlan(plan:LearningPlan,job:{state:string;code?:string;message:string},now=Date.now()):LearningPlan {
  const complete=job.state==='complete';
  return {...plan,result:complete?'complete':'error',message:job.message,requiresLogin:job.code==='login_required',
    lastSuccessfulAt:complete?now:plan.lastSuccessfulAt,nextRunAt:now+(complete?DAY_MS:60*60*1000)};
}
