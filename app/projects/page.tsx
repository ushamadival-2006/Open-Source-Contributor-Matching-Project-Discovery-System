/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";

const API = process.env.NEXT_PUBLIC_PROJECT_API_URL || "http://localhost:8000";
type Project = { project_id:number; title:string; description:string; difficulty:string; status:string; category?:string; required_skills?:string[]; open_issues?:number; stars?:number; repo_url?:string|null };
export default function ProjectsPage() {
  const [q,setQ]=useState(""); const [difficulty,setDifficulty]=useState(""); const [items,setItems]=useState<Project[]>([]); const [error,setError]=useState(""); const [loading,setLoading]=useState(true);
  async function load(){setLoading(true);setError("");try{const params=new URLSearchParams();if(q)params.set("q",q);if(difficulty)params.set("difficulty",difficulty);const r=await fetch(`${API}/projects?${params.toString()}`);if(!r.ok)throw new Error((await r.json()).detail||"Could not load projects");const d=await r.json();setItems(d.items||[]);}catch(e){setError(e instanceof Error?e.message:"Could not connect to project service");}finally{setLoading(false)}}
  useEffect(()=>{load();},[]);
  return <Layout><div className="page-heading"><h1>Discover projects</h1><p>Search active repositories by name, description, skills, or technology.</p></div>
    <form onSubmit={e=>{e.preventDefault();load()}} className="surface-card" style={{display:"grid",gridTemplateColumns:"minmax(220px,1fr) 180px auto",gap:10,margin:"18px 0",padding:14}}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search projects or skills"/><select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="">All difficulty levels</option><option>beginner</option><option>intermediate</option><option>advanced</option></select><button type="submit">Search projects</button></form>
    {error&&<p role="alert" className="surface-card" style={{padding:14,color:"#b4233a"}}>{error}. Make sure the backend is running on port 8000.</p>}{loading?<p className="surface-card" style={{padding:20}}>Loading projects…</p>:<div className="project-grid">{items.map(p=><article className="project-card" key={p.project_id}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><span className="badge">{p.category||"Uncategorised"}</span><span className="badge badge-green">{p.status}</span></div><h2 style={{marginTop:14}}>{p.title}</h2><p>{p.description}</p><div style={{display:"flex",flexWrap:"wrap",gap:6,margin:"14px 0"}}>{(p.required_skills||[]).slice(0,5).map(skill=><span className="badge" key={skill}>{skill}</span>)}</div><p>{p.open_issues||0} open issues · {p.stars||0} stars · {p.difficulty}</p><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12}}><Link href={`/projects/${p.project_id}`} style={{color:"var(--blue)",fontWeight:800,fontSize:13}}>View project →</Link>{p.repo_url&&<a href={p.repo_url} target="_blank" rel="noreferrer" style={{color:"var(--muted)",fontSize:12}}>Repository</a>}</div></article>)}</div>}
  </Layout>;
}
