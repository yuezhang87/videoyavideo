"use client";
import { useState } from "react";
import type { VideoLink } from "@/lib/types";

export function VideoCard({ v }: { v: VideoLink }) {
  const [playing, setPlaying] = useState(false);

  if (!v.id) {
    return (
      <a className="vcard vsearch" href={v.url} target="_blank" rel="noopener noreferrer">
        <span className="vplay">🔎</span>
        <strong>{v.title}</strong>
        <small>Opens YouTube search</small>
      </a>
    );
  }

  return (
    <div className="vcard">
      <div className="vthumb">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`}
            title={v.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <button type="button" className="vbtn" onClick={() => setPlaying(true)} aria-label={`Play ${v.title}`}>
            {v.thumbnail && <img src={v.thumbnail} alt="" loading="lazy" />}
            <span className="vplay">▶</span>
          </button>
        )}
      </div>
      <div className="vmeta">
        <strong>{v.title}</strong>
        <small>
          {v.channel ? `${v.channel} · ` : ""}
          <a href={v.url} target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a>
        </small>
      </div>
    </div>
  );
}
