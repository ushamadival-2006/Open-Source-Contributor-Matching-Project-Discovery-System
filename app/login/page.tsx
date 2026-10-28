"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setBusy(true);
    const f = new FormData(e.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: f.get("email"), password: f.get("password") }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) { setError(data.error || "Login failed."); return; }
    router.push("/profile"); router.refresh();
  }
  return <Layout><div className="auth-shell"><div className="auth-card"><h1>Welcome back</h1><form onSubmit={submit}>
    <label>Email<input name="email" type="email" required placeholder="you@example.com" /></label>
    <label>Password<input name="password" type="password" required placeholder="Your password" /></label>
    {error && <p role="alert">{error}</p>}<button disabled={busy}>{busy ? "Signing in..." : "Login"}</button>
  </form><p className="auth-footer">New to the platform? <a href="/register">Create an account</a></p></div></div></Layout>;
}
