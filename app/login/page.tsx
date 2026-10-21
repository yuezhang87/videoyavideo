"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { data, error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setMsg(error.message);
    if (mode === "up" && !data.session) return setMsg("Check your email to confirm your account, then sign in.");
    router.push("/");
    router.refresh();
  }

  return (
    <form className="card" onSubmit={submit} style={{ maxWidth: 380, margin: "32px auto" }}>
      <h1>{mode === "in" ? "Sign in" : "Create account"}</h1>
      <label htmlFor="email">Email</label>
      <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <label htmlFor="pw">Password</label>
      <input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      {msg && <p className="err">{msg}</p>}
      <p>
        <button disabled={busy}>{mode === "in" ? "Sign in" : "Sign up"}</button>{" "}
        <button type="button" className="ghost" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Need an account?" : "Have an account?"}
        </button>
      </p>
    </form>
  );
}
