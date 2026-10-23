"use client";
import {useEffect,useRef,useState} from "react";
import {CheckCircle2,Link2,Loader2,ShieldCheck} from "lucide-react";
import {appFetch as fetch,localizeExternal,uiText} from "@/lib/messages";
import {activeProfile,supportsSchoolConnection,type ProfileSettings} from "@/lib/lms-profile";
import type {LearningPlan} from "@/lib/learning-plan";
import {useT} from "@/lib/i18n";
import styles from "./SchoolConnectionCard.module.css";

type Job={profileId:string;state:"running"|"complete"|"error";message:string;code?:string};
type Status={settings:ProfileSettings;job:Job|null;learningSync:LearningPlan};
export default function SchoolConnectionCard({entryUrl}:{entryUrl:string}){
  const {lang}=useT();
  const [status,setStatus]=useState<Status|null>(null),[school,setSchool]=useState("");
  const [autoSync,setAutoSync]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [supported,setSupported]=useState(false);
  const previous=useRef("");
  const initialized=useRef(false);
  const profile=status?activeProfile(status.settings):undefined;
  const matches=profile?.origin===new URL(entryUrl).origin;
  const job=matches&&status?.job?.profileId===profile?.id?status.job:null;
  const plan=matches?status?.learningSync:undefined;
  const semester=matches?profile?.semesters.find(s=>s.id===profile.activeSemesterId):undefined;
  const running=job?.state==="running";
  useEffect(()=>{
    let live=true;
    async function refresh(){
      try{
        const response=await fetch("/api/lms/settings",{cache:"no-store"});
        const data=await response.json();if(!response.ok)throw new Error(data.error||uiText("school.auto.loadFailed"));
        if(!live)return;
        setStatus(data);
        const active=activeProfile(data.settings);
        if(!initialized.current){setAutoSync(active?.origin===new URL(entryUrl).origin&&data.learningSync?.enabled===true);initialized.current=true;}
        const state=data.job?.state||"";
        if(previous.current==="running"&&state!=="running")window.dispatchEvent(new Event("butler:lms-changed"));
        previous.current=state;
      }catch(e){if(live)setError(e instanceof Error?e.message:uiText("school.auto.loadFailed"));}
    }
    void refresh();
    void fetch("/api/lms/settings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({entryUrl,confirm:false})}).then(async response=>{
      const data=await response.json();if(!response.ok)throw new Error(data.error||uiText("school.auto.loadFailed"));
      if(live){setSchool(data.preview.school);setSupported(supportsSchoolConnection(data.preview.domain,data.preview.platform));}
    }).catch(e=>{if(live)setError(e.message);});
    const timer=setInterval(refresh,2000);
    return()=>{live=false;clearInterval(timer);};
  },[entryUrl]);
  async function send(action:"agent-connect"|"learning-sync-now"|"cancel"){
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/lms/settings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,entryUrl,confirm:true,downloadSelected:true,autoSync})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||uiText("school.auto.workerFailed"));
      setStatus(prev=>({...prev,...data}));previous.current=data.job?.state||"";
      window.dispatchEvent(new Event("butler:lms-changed"));
    }catch(e){setError(e instanceof Error?e.message:uiText("school.auto.workerFailed"));}
    finally{setBusy(false);}
  }
  return <section className={styles.card} aria-label={uiText("agent.school.title")}>
    <div className={styles.heading}><span className={styles.icon}><Link2 size={21}/></span><div><small>{uiText("agent.school.eyebrow")}</small><h3>{school||uiText("agent.school.title")}</h3></div>{job?.state==="complete"&&<CheckCircle2 size={21}/>}</div>
    <p className={styles.url}>{entryUrl}</p>
    <p>{uiText("agent.school.intro")}</p>
    <ol className={styles.steps}><li>{uiText("agent.school.stepSignIn")}</li><li>{uiText("agent.school.stepDiscover")}</li><li>{uiText("agent.school.stepRead")}</li></ol>
    <div className={styles.consent}>
      <label><input type="checkbox" checked={autoSync} disabled={busy||running} onChange={e=>setAutoSync(e.target.checked)}/><span>{uiText("learning.enable")}</span></label>
      <p>{uiText("learning.help")}</p>
    </div>
    {semester?.confirmed&&<p>{uiText("agent.school.detected",{term:semester.label,count:semester.courses.filter(c=>c.selected&&c.status==="active").length})}</p>}
    <div role="status" aria-live="polite" className={styles.status}>{running&&<Loader2 size={17} className={styles.spinner}/>}<span>{localizeExternal(error||job?.message||plan?.message||(!supported&&school?uiText("school.auto.connectionUnsupported"):""))}</span></div>
    {plan?.requiresLogin&&<p>{uiText("learning.loginRequired")}</p>}
    {plan?.enabled&&plan.nextRunAt&&!plan.requiresLogin&&!running&&<p>{uiText("learning.next",{date:new Date(plan.nextRunAt).toLocaleString(lang==="zh"?"zh-CN":"en-GB")})}</p>}
    <div className={styles.actions}>
      {running?<button disabled={busy} onClick={()=>void send("cancel")}>{uiText("school.auto.cancel")}</button>:<button className={styles.primary} disabled={busy||!supported} onClick={()=>void send("agent-connect")}>{uiText(job?.state==="complete"?"agent.school.reconnect":"agent.school.connect")}</button>}
      {matches&&plan?.enabled&&!plan.requiresLogin&&!running&&<button disabled={busy} onClick={()=>void send("learning-sync-now")}>{uiText("learning.refreshNow")}</button>}
      {matches&&<a href="/?view=courses">{uiText("agent.school.openCourses")}</a>}
    </div>
    <p className={styles.privacy}><ShieldCheck size={16}/>{uiText("agent.school.privacy")}</p>
  </section>;
}
