"use client";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";

type Application = { application_id:number; status:string; applied_at:string; title:string; description:string; difficulty:string };
export default function ApplicationsPage() {
  const [items,setItems]=useState<Application[]>([]);
  const [message,setMessage]=useState("Loading applications...");
  useEffect(()=>{fetch("/api/applications").then(async r=>({ok:r.ok,data:await r.json()})).then(({ok,data})=>{
    if(!ok){setMessage(data.error||"Please log in.");return;}
    setItems(data.applications||[]);setMessage("");
  }).catch(()=>setMessage("Could not load applications."));},[]);
  return <Layout><div className="page-heading"><h1>My applications</h1><p>Track the projects you have applied to and their current status.</p></div>{message&&<p className="surface-card" style={{padding:16}}>{message}</p>}
    {items.length===0&&!message&&<div className="surface-card" style={{padding:24}}>You have not applied to any projects yet.</div>}
    <div className="recommendation-grid">{items.map(a=><article key={a.application_id} style={{padding:18}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:8}}><span className="badge">{a.difficulty}</span><span className={`status-badge badge-${a.status.toLowerCase()==="accepted"?"green":a.status.toLowerCase()==="rejected"?"red":"orange"}`}>{a.status}</span></div>
      <h2 style={{marginTop:14}}>{a.title}</h2><p>{a.description}</p><p style={{marginBottom:0}}>Applied {new Date(a.applied_at).toLocaleString()}</p>
    </article>)}</div>
  </Layout>;
}
