/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";
import { Suspense } from "react";
import Link from "next/link";
import { type FormEvent,useEffect,useState } from "react";
import { useParams } from "next/navigation";
import Layout from "../../components/Layout";
const API=process.env.NEXT_PUBLIC_PROJECT_API_URL||"http://localhost:8000";
type Issue={issue_id:number;title:string;description?:string;label?:string;status:string};
type Project={project_id:number;title:string;description:string;repo_url?:string|null;category?:string;difficulty:string;status:string;required_skills?:string[];issues?:Issue[];open_issues?:number};
export default function ProjectDetail(){
 return <Suspense fallback={<main className="page-container"><p>Loading project…</p></main>}><ProjectDetailContent /></Suspense>;
}
function ProjectDetailContent(){
 const params=useParams<{projectId:string}>();const [p,setP]=useState<Project|null>(null);const [err,setErr]=useState("");const [role,setRole]=useState("");const [issueTitle,setIssueTitle]=useState("");const [issueDescription,setIssueDescription]=useState("");const [issueLabel,setIssueLabel]=useState("good first issue");const [message,setMessage]=useState("");
 async function load(){const r=await fetch(`${API}/projects/${params.projectId}`);if(!r.ok)throw new Error("Project not found");setP(await r.json());}
 useEffect(()=>{load().catch(e=>setErr(e.message));fetch("/api/auth/me").then(r=>r.json()).then(d=>setRole(d.user?.role||"signed-out")).catch(()=>setRole("signed-out"));},[params.projectId]);
 async function addIssue(e:FormEvent){e.preventDefault();setMessage("");try{const r=await fetch(`${API}/projects/${params.projectId}/issues`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:issueTitle,description:issueDescription||null,label:issueLabel})});const d=await r.json();if(!r.ok)throw new Error(d.detail||"Unable to create issue");setIssueTitle("");setIssueDescription("");setMessage(`Created issue #${d.issue_id}`);await load();}catch(e){setMessage(e instanceof Error?e.message:"Request failed");}}
 async function closeIssue(issue:Issue){try{const r=await fetch(`${API}/issues/${issue.issue_id}`,{method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:issue.status==="closed"?"open":"closed"})});const d=await r.json();if(!r.ok)throw new Error(d.detail||"Unable to update issue");await load();}catch(e){setMessage(e instanceof Error?e.message:"Request failed");}}
 return <Layout><p><Link href="/projects">← All projects</Link></p>{err&&<p role="alert">{err}</p>}{!p&&!err?<p>Loading project…</p>:p&&<><h1>{p.title}</h1><p>{p.description}</p><p>Category: {p.category||"Uncategorised"} · Difficulty: {p.difficulty} · Status: {p.status}</p><h2>Required skills</h2><p>{(p.required_skills||[]).join(", ")||"No skills specified"}</p>{p.repo_url&&<p><a href={p.repo_url} target="_blank" rel="noreferrer">Open repository</a></p>}<h2>Available issues</h2>{(p.issues||[]).length===0?<p>No issues have been added yet.</p>:<ul>{p.issues?.map(i=><li key={i.issue_id} style={{marginBottom:12}}><strong>{i.title}</strong> — {i.status} {i.label&&`· ${i.label}`}{i.description&&<p>{i.description}</p>}{role==="admin"&&<button type="button" onClick={()=>closeIssue(i)}>{i.status==="closed"?"Reopen issue":"Close issue"}</button>}</li>)}</ul>}{role==="admin"&&<form onSubmit={addIssue} style={{display:"grid",gap:10,maxWidth:600,border:"1px solid #ddd",borderRadius:12,padding:16,marginTop:20}}><h3>Add an issue (admin)</h3><input required placeholder="Issue title" value={issueTitle} onChange={e=>setIssueTitle(e.target.value)} style={{padding:10}}/><textarea placeholder="Description" value={issueDescription} onChange={e=>setIssueDescription(e.target.value)} style={{padding:10}}/><input placeholder="Label" value={issueLabel} onChange={e=>setIssueLabel(e.target.value)} style={{padding:10}}/><button type="submit">Create issue</button>{message&&<p role="status">{message}</p>}</form>}</>}</Layout>
}
