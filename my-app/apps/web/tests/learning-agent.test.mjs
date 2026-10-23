import {test} from 'node:test';
import assert from 'node:assert/strict';
import {schoolConnectionIntent} from '../src/lib/school-agent-intent.ts';
import {configureLearningPlan, claimLearningPlan, finishLearningPlan, learningPlanDue, DAY_MS} from '../src/lib/learning-plan.ts';

test('a school link in conversation produces a connection request, never a model claim of access',()=>{
 assert.deepEqual(schoolConnectionIntent('Connect my school and keep it updated: https://rplms.polite.edu.sg/d2l/home'),{kind:'connect',entryUrl:'https://rplms.polite.edu.sg/d2l/home'});
 assert.deepEqual(schoolConnectionIntent('https://tplms.polite.edu.sg/d2l/home'),{kind:'connect',entryUrl:'https://tplms.polite.edu.sg/d2l/home'});
 assert.equal(schoolConnectionIntent('帮我接入学校并持续同步 https://splms.polite.edu.sg/d2l/home').kind,'connect');
 assert.equal(schoolConnectionIntent('Connect my school learning site').kind,'request-url');
 assert.equal(schoolConnectionIntent('Explain SSR using https://rplms.polite.edu.sg/d2l/le/content/123/View'),null);
 assert.equal(schoolConnectionIntent('Explain React components'),null);
});
test('credential links, local hosts and ambiguous links never become connection actions',()=>{
 for(const url of ['https://user:password@school.edu','https://school.edu/?token=private','http://127.0.0.1:3000','https://school.edu/#secret'])assert.equal(schoolConnectionIntent('Connect my school '+url).kind,'invalid-url');
 assert.equal(schoolConnectionIntent('Connect https://rplms.polite.edu.sg/d2l/home and https://tplms.polite.edu.sg/d2l/home').kind,'one-url');
});
test('daily refresh consent is explicit and survives a serialized restart',()=>{
 const disabled=configureLearningPlan(undefined,'profile-a',false,1000);
 assert.equal(learningPlanDue(disabled,2000),false);
 const enabled=configureLearningPlan(disabled,'profile-a',true,1000);
 assert.equal(enabled.enabled,true);assert.equal(enabled.downloadSelected,true);
 assert.equal(learningPlanDue(enabled,1000),true);
 const claimed=claimLearningPlan(enabled,1000);
 const restored=JSON.parse(JSON.stringify(claimed));
 assert.equal(learningPlanDue(restored,1000,true),false);assert.equal(restored.nextRunAt,1000+DAY_MS);
 assert.equal(learningPlanDue(restored,1000),true,'An interrupted worker is retried on restart');
 assert.equal(learningPlanDue(restored,1000+DAY_MS,true),false);
 assert.equal(learningPlanDue(restored,1000+DAY_MS),true);
});
test('expired sessions pause unattended collection and explicit revalidation resumes it',()=>{
 const enabled=configureLearningPlan(undefined,'profile-a',true,1000);
 const expired=finishLearningPlan(enabled,{state:'error',code:'login_required',message:'Sign in'},2000);
 assert.equal(expired.requiresLogin,true);assert.equal(learningPlanDue(expired,DAY_MS*3),false);
 const revalidated=finishLearningPlan(expired,{state:'complete',message:'Ready'},3000);
 assert.equal(revalidated.requiresLogin,false);assert.equal(revalidated.lastSuccessfulAt,3000);
 assert.equal(revalidated.nextRunAt,3000+DAY_MS);
 const stopped=configureLearningPlan(revalidated,'profile-a',false,4000);
 assert.equal(finishLearningPlan(stopped,{state:'complete',message:'old worker'},5000).enabled,false);
});
