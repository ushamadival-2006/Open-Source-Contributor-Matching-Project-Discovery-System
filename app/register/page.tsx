"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setBusy(true);
    const f = new FormData(e.currentTarget);
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: f.get("name"), email: f.get("email"), password: f.get("password") }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) { setError(data.error || "Registration failed."); return; }
    router.push("/profile"); router.refresh();
  }
  return <Layout><div className="auth-shell"><div className="auth-card"><h1>Create your account</h1><form onSubmit={submit}>
    <label>Name<input name="name" required maxLength={100} placeholder="Your full name" /></label>
    <label>Email<input name="email" type="email" required placeholder="you@example.com" /></label>
    <label>Password (minimum 8 characters)<input name="password" type="password" minLength={8} maxLength={128} required placeholder="Create a strong password" /></label>
    {error && <p role="alert">{error}</p>}<button disabled={busy}>{busy ? "Creating..." : "Register"}</button>
  </form><p className="auth-footer">Already have an account? <a href="/login">Login</a></p></div></div></Layout>;
}
