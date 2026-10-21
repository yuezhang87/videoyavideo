import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeedbackView } from "@/components/FeedbackView";
import type { Feedback, Metrics, VideoLink } from "@/lib/types";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: row } = await supabase.from("analyses").select("*").eq("id", id).maybeSingle();
  if (!row) notFound();

  return (
    <>
      <p><Link href="/history">← History</Link></p>
      <h1>{row.piece || "Practice session"}</h1>
      <p className="muted">{new Date(row.created_at).toLocaleString()}</p>
      {row.thumbnail && <img src={row.thumbnail} alt="Frame from your clip" style={{ borderRadius: 8 }} />}
      <FeedbackView result={{ feedback: row.feedback as Feedback, videos: row.videos as VideoLink[] }} metrics={row.metrics as Metrics} />
    </>
  );
}
