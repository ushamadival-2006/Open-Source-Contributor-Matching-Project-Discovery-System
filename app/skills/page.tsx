"use client";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";

type Skill = { skill_id: number; skill_name: string };
export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selected, setSelected] = useState<Record<number,string>>({});
  const [message, setMessage] = useState("Loading skills...");
  useEffect(() => {
    Promise.all([fetch("/api/skills").then(r=>r.json()), fetch("/api/profile").then(r=>r.json())]).then(([s,p]) => {
      setSkills(s.skills || []);
      const chosen: Record<number,string> = {};
      (p.profile?.skills || []).forEach((x: {skill_id:number; proficiency:string}) => { chosen[x.skill_id] = x.proficiency; });
      setSelected(chosen); setMessage("");
    }).catch(()=>setMessage("Could not load skills. Please check the database."));
  }, []);
  async function save() {
    const body = { skills: Object.entries(selected).map(([id,proficiency])=>({skill_id:Number(id),proficiency})) };
    const r = await fetch("/api/skills", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
    const d = await r.json(); setMessage(r.ok ? `Saved ${d.count} skills.` : d.error || "Save failed.");
  }
  return <Layout><div className="page-heading"><h1>My skills</h1><p>Select the technologies you know and set your proficiency level.</p></div>{message && <p role="status" style={{marginBottom:16}}>{message}</p>}
    <div className="surface-card" style={{display:"grid",maxWidth:720,padding:"8px 20px 20px"}}>
      {skills.map(s=><div key={s.skill_id} style={{display:"grid",gridTemplateColumns:"minmax(180px,1fr) 150px",gap:16,alignItems:"center",borderBottom:"1px solid var(--border)",padding:"12px 0"}}>
        <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}><input type="checkbox" checked={Boolean(selected[s.skill_id])} onChange={e=>setSelected(old=>{
          const next={...old}; if(e.target.checked) next[s.skill_id]="beginner"; else delete next[s.skill_id]; return next;
        })}/><span>{s.skill_name}</span></label>
        {selected[s.skill_id] && <select value={selected[s.skill_id]} onChange={e=>setSelected(old=>({...old,[s.skill_id]:e.target.value}))}>
          <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
        </select>}
      </div>)}
      <div style={{paddingTop:16}}><button onClick={save}>Save skills</button></div>
    </div>
  </Layout>;
}
