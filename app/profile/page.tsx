"use client";
import { FormEvent, useEffect, useState } from "react";
import Layout from "../components/Layout";

type Profile = { name: string; email: string; bio: string | null; experience_level: string | null; interests: string | null };
export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("Loading profile...");
  useEffect(() => { fetch("/api/profile").then(async r => ({ ok: r.ok, data: await r.json() })).then(({ok,data}) => {
    if (!ok) { setMessage(data.error || "Please log in."); return; }
    setProfile(data.profile); setMessage("");
  }).catch(() => setMessage("Could not load profile.")); }, []);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio: f.get("bio"), experience_level: f.get("experience_level"), interests: f.get("interests") }) });
    const data = await response.json(); setMessage(response.ok ? "Profile saved." : data.error || "Save failed.");
  }
  return <Layout><div className="page-heading"><h1>Developer profile</h1><p>Keep your experience and interests up to date for better project matches.</p></div>{message && <p role="status" style={{marginBottom:16}}>{message}</p>}{profile && <form onSubmit={save} className="surface-card" style={{display:"grid",gap:16,maxWidth:720,padding:24}}>
    <div style={{paddingBottom:16,borderBottom:"1px solid var(--border)"}}><strong style={{fontSize:16}}>{profile.name}</strong><div style={{marginTop:4,color:"var(--muted)",fontSize:13}}>{profile.email}</div></div>
    <label>Bio<textarea name="bio" defaultValue={profile.bio || ""} maxLength={3000} rows={5} placeholder="A short summary of your background and goals" /></label>
    <label>Experience level<select name="experience_level" defaultValue={profile.experience_level || "beginner"}>
      <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
    </select></label>
    <label>Interests<input name="interests" defaultValue={profile.interests || ""} maxLength={1000} placeholder="e.g. developer tools, climate, accessibility" /></label>
    <div><button type="submit">Save profile</button></div>
  </form>}</Layout>;
}
