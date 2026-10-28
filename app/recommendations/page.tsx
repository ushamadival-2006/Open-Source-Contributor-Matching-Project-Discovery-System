/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";

type Rec = { project_id:number; title:string; description:string; difficulty:string; category_name?:string; match_score?:number; similarity_score?:number; matched_skills?:string[] };
export default function RecommendationsPage() {
  const [items,setItems]=useState<Rec[]>([]);
  const [message,setMessage]=useState("Loading recommendations...");
  const [semantic,setSemantic]=useState(false);
  async function load(useSemantic:boolean) {
    setMessage("Loading recommendations...");
    const r=await fetch(`/api/recommendations${useSemantic?"?semantic=true":""}`);
    const d=await r.json();
    if(!r.ok){setMessage(d.error||"Could not load recommendations.");return;}
    setItems(d.recommendations||[]);
    setMessage(d.method==="qdrant-semantic"?"Semantic recommendations from Qdrant.":"Skill-overlap recommendations. Semantic mode requires OpenAI and Qdrant configuration and indexed projects.");
  }
  useEffect(()=>{load(false);},[]);
  return <Layout><div className="page-heading"><h1>Recommended projects</h1><p>Curated matches based on your selected skills and profile.</p></div>
    <div className="surface-card" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:16,marginBottom:16}}><label style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" checked={semantic} onChange={e=>{setSemantic(e.target.checked);load(e.target.checked);}}/> Use semantic search when configured</label><span className="badge">{message}</span></div>
    {items.length===0&&!message.includes("Loading")?<div className="surface-card" style={{padding:24}}>No recommendations are available yet. Add more skills to improve your matches.</div>:<div className="recommendation-grid">{items.map(p=><article key={p.project_id} style={{padding:18}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:8}}><span className="badge">{p.category_name||"Open source"}</span>{typeof p.match_score=== "number"&&<span className="badge badge-green">{p.match_score}% match</span>}</div>
      <h2 style={{marginTop:14}}>{p.title}</h2><p>{p.description}</p><p>{p.difficulty}{p.category_name?` · ${p.category_name}`:""}</p>
      {typeof p.match_score=== "number"&&<p><strong>Matching skills:</strong> {p.matched_skills?.join(", ")||"Profile overlap"}</p>}
      {typeof p.similarity_score=== "number"&&<p><strong>Semantic similarity:</strong> {p.similarity_score}%</p>}
      <button style={{marginTop:8}} onClick={async()=>{const r=await fetch("/api/applications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({project_id:p.project_id})});const d=await r.json();alert(r.ok?"Application submitted.":d.error||"Application failed.");}}>Apply to project</button>
    </article>)}</div>}
  </Layout>;
}
