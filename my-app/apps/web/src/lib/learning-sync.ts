import {readState,writeState} from './server-db';
import {activeProfile,supportsSchoolConnection} from './lms-profile';
import {readProfiles} from './lms-profile-store';
import {schoolJob,startSchoolDiscovery} from './lms-worker';
import {configureLearningPlan,claimLearningPlan,finishLearningPlan,learningPlanDue,type LearningPlan} from './learning-plan';
import {uiText} from './messages';

const KEY='learning-material-sync';
const plans=()=>readState(KEY) as LearningPlan[];
function store(plan:LearningPlan){writeState(KEY,plans().filter(p=>p.profileId!==plan.profileId).concat(plan));return plan;}
export function learningSyncStatus(){
  const id=readProfiles().activeProfileId||'';
  return plans().find(p=>p.profileId===id)||{profileId:id,enabled:false,downloadSelected:true} as LearningPlan;
}
export function configureLearningSync(enabled:boolean){
  const profile=activeProfile(readProfiles());
  if(!profile||!supportsSchoolConnection(profile.domain,profile.platform))throw new Error(uiText('school.auto.connectionUnsupported'));
  return store(configureLearningPlan(learningSyncStatus(),profile.id,enabled));
}
export function settleLearningSync(profileId:string,job:{state:string;code?:string;message:string}){
  const plan=plans().find(p=>p.profileId===profileId);
  if(plan)store(finishLearningPlan(plan,job));
}
/** Unattended refresh reuses a valid session. It never opens sign-in or calls cloud AI. */
export function maybeStartLearningSync(force=false){
  const plan=learningSyncStatus(),profile=activeProfile(readProfiles());
  const semester=profile?.semesters.find(s=>s.id===profile.activeSemesterId);
  if(!plan.enabled||plan.requiresLogin||schoolJob()?.state==='running'||!profile||!semester?.confirmed)return plan;
  if(!semester.courses.some(c=>c.selected&&c.status==='active')||!force&&!learningPlanDue(plan))return plan;
  const claimed=store(claimLearningPlan(plan));
  try{startSchoolDiscovery(false,true,{onSettled:job=>settleLearningSync(plan.profileId,job)});}
  catch(error){store(finishLearningPlan(claimed,{state:'error',message:error instanceof Error?error.message:uiText('school.auto.workerFailed')}));}
  return learningSyncStatus();
}
