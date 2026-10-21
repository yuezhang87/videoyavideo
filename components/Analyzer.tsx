"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TrackedPlayer } from "./TrackedPlayer";
import { FeedbackView } from "./FeedbackView";
import { computeMetrics } from "@/lib/analysis";
import { drawOverlay } from "@/lib/overlay";
import { MAX_SECONDS, trackVideo } from "@/lib/tracker";
import type { AnalysisResult, Metrics, TrackFrame } from "@/lib/types";

type Stage = "idle" | "tracking" | "coaching" | "done";

function capture(video: HTMLVideoElement, frames: TrackFrame[], t: number, width: number): Promise<string> {
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      const h = Math.round((width * video.videoHeight) / video.videoWidth);
      const out = document.createElement("canvas");
      out.width = width;
      out.height = h;
      const overlay = document.createElement("canvas");
      overlay.width = width;
      overlay.height = h;
      const ctx = out.getContext("2d")!;
      ctx.drawImage(video, 0, 0, width, h);
      drawOverlay(overlay.getContext("2d")!, frames, t, { trails: true, skeleton: true });
      ctx.drawImage(overlay, 0, 0);
      resolve(out.toDataURL("image/jpeg", 0.7));
    };
    video.addEventListener("seeked", done);
    video.currentTime = t;
  });
}

export function Analyzer({ signedIn, guest }: { signedIn: boolean; guest: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [piece, setPiece] = useState("");
  const [notes, setNotes] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [frames, setFrames] = useState<TrackFrame[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [result, setResult] = useState<(AnalysisResult & { id: string | null; saved: boolean }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  function onFile(file: File | undefined) {
    if (!file) return;
    if (src) URL.revokeObjectURL(src);
    setSrc(URL.createObjectURL(file));
    setFrames([]);
    setMetrics(null);
    setResult(null);
    setError(null);
    setStage("idle");
  }

  async function run() {
    const video = videoRef.current;
    if (!video || !src) return;
    setError(null);
    setResult(null);
    try {
      setStage("tracking");
      setProgress(0);
      if (video.readyState < 1) await new Promise((r) => video.addEventListener("loadedmetadata", r, { once: true }));
      const { frames: tracked, duration } = await trackVideo(video, setProgress);
      setFrames(tracked);
      const m = computeMetrics(tracked, duration);
      setMetrics(m);

      if (m.trackedShare < 0.05) {
        setStage("idle");
        setError("I couldn’t find hands in this clip. Make sure your hands are well lit and fully in frame, then try again.");
        return;
      }
      if (!signedIn && !guest) {
        setStage("done");
        return;
      }

      setStage("coaching");
      const times = [0.2, 0.5, 0.8].map((p) => p * duration);
      const shots: string[] = [];
      for (const t of times) shots.push(await capture(video, tracked, t, 640));
      const thumbnail = await capture(video, tracked, 0.5 * duration, 240);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ metrics: m, piece, notes, frames: shots, thumbnail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Analysis failed");
      setResult(json);
      setStage("done");
      video.currentTime = 0;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStage("idle");
    }
  }

  const busy = stage === "tracking" || stage === "coaching";

  return (
    <div>
      {!src ? (
        <label className="drop" style={{ display: "block", cursor: "pointer" }}>
          <strong>Choose a video of your playing</strong>
          <div>Side view of your hands on the keys · up to {MAX_SECONDS} seconds · stays on your device while it’s analyzed</div>
          <input type="file" accept="video/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      ) : (
        <>
          {frames.length > 0 ? (
            <TrackedPlayer src={src} frames={frames} videoRef={videoRef} />
          ) : (
            <div className="stage"><video ref={videoRef} src={src} controls playsInline muted /></div>
          )}

          <div className="card">
            <label htmlFor="piece">Piece you’re playing (optional)</label>
            <input id="piece" type="text" value={piece} onChange={(e) => setPiece(e.target.value)} placeholder="e.g. Für Elise, opening" disabled={busy} />
            <label htmlFor="notes">Anything you want me to look at? (optional)</label>
            <textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. my right hand feels tense" disabled={busy} />
            <p>
              <button onClick={run} disabled={busy}>{busy ? "Working…" : result ? "Analyze again" : "Track & coach me"}</button>{" "}
              <label className="btn ghost" style={{ margin: 0, color: "var(--fg)" }}>
                Different video
                <input type="file" accept="video/*" hidden disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            </p>
            {stage === "tracking" && (
              <>
                <div className="bar"><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>
                <p className="muted">Tracking your fingers… {Math.round(progress * 100)}% (the first run downloads a small model)</p>
              </>
            )}
            {stage === "coaching" && <p className="muted">Your coach is looking at the results…</p>}
            {error && <p className="err">{error}</p>}
          </div>
        </>
      )}

      {stage === "done" && !signedIn && !guest && (
        <div className="card">
          Finger tracking is ready — press play above. <Link href="/login">Sign in</Link> to get coaching feedback, YouTube lessons and a saved history.
        </div>
      )}

      {result && (
        <>
          {result.saved && result.id && (
            <p className="muted">Saved to your <Link href={`/session/${result.id}`}>history</Link>.</p>
          )}
          {!result.saved && !guest && <p className="err">Feedback couldn’t be saved to your history (is the database set up?).</p>}
          <FeedbackView result={result} metrics={metrics ?? undefined} />
        </>
      )}
    </div>
  );
}
