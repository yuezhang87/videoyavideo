"use client";
import { useEffect, useRef, useState } from "react";
import { FINGERS, type TrackFrame } from "@/lib/types";
import { FINGER_COLORS, FINGER_LABELS } from "@/lib/analysis";
import { drawOverlay } from "@/lib/overlay";

export function TrackedPlayer({
  src,
  frames,
  videoRef,
}: {
  src: string;
  frames: TrackFrame[];
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}) {
  const own = useRef<HTMLVideoElement>(null);
  const video = videoRef ?? own;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [trails, setTrails] = useState(true);
  const [skeleton, setSkeleton] = useState(true);
  const [rate, setRate] = useState(1);
  const opts = useRef({ trails, skeleton });
  opts.current = { trails, skeleton };

  useEffect(() => {
    const v = video.current;
    const c = canvas.current;
    if (!v || !c) return;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    const tick = () => {
      if (c.width !== v.videoWidth || c.height !== v.videoHeight) {
        c.width = v.videoWidth || 640;
        c.height = v.videoHeight || 360;
      }
      drawOverlay(ctx, frames, v.currentTime, opts.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frames, video]);

  useEffect(() => {
    if (video.current) video.current.playbackRate = rate;
  }, [rate, video, src]);

  return (
    <div>
      <div className="stage">
        <video ref={video} src={src} controls playsInline muted loop />
        <canvas ref={canvas} />
      </div>
      <div className="controls">
        <label><input type="checkbox" checked={skeleton} onChange={(e) => setSkeleton(e.target.checked)} /> Hand skeleton</label>
        <label><input type="checkbox" checked={trails} onChange={(e) => setTrails(e.target.checked)} /> Finger trails</label>
        <label>
          Speed
          <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
            <option value={0.25}>0.25×</option>
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
          </select>
        </label>
      </div>
      <div className="legend">
        {FINGERS.map((f) => (
          <span key={f}><i style={{ background: FINGER_COLORS[f] }} />{FINGER_LABELS[f]}</span>
        ))}
      </div>
    </div>
  );
}
