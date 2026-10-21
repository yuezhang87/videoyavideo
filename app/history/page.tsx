import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: rows } = await supabase
    .from("analyses")
    .select("id, created_at, piece, duration_seconds, thumbnail, feedback")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <>
      <h1>Your history</h1>
      {!rows?.length && <p className="muted">No sessions yet. <Link href="/">Analyze your first clip.</Link></p>}
      <div className="grid">
        {rows?.map((r) => (
          <Link key={r.id} href={`/session/${r.id}`} className="vid card">
            {r.thumbnail && <img src={r.thumbnail} alt="" />}
            <div><strong>{r.piece || "Untitled practice"}</strong></div>
            <small>{new Date(r.created_at).toLocaleString()} · {Math.round(r.duration_seconds ?? 0)}s</small>
            <p className="muted" style={{ margin: "6px 0 0" }}>{(r.feedback as { summary?: string }).summary?.slice(0, 120)}…</p>
          </Link>
        ))}
      </div>
    </>
  );
}
