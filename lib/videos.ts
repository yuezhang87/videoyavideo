import type { VideoLink } from "./types";
import { searchUrl } from "./youtube";

type Pick = { id: string; title: string };

/**
 * Hand-picked beginner lessons per topic (found via search, not verified frame by
 * frame). Lets the free version show real video cards without a YouTube API key.
 */
const CURATED: Record<string, Pick[]> = {
  hand: [
    { id: "F8fKXmcL7ao", title: "The Only Piano Hand Position Video You’ll Ever Need (5-Minute Fix)" },
    { id: "p_6y7MPW_Ek", title: "PIANO BASICS Part 2: Hand Shape and Position!" },
  ],
  wrist: [
    { id: "cp9kJ1pv4tU", title: "Piano Tip from Christie Peery: Wrist Position" },
    { id: "CyN88e5SFjk", title: "Correct Hand Shape & Wrist Position" },
  ],
  tension: [
    { id: "8mXXi9iygnc", title: "Learn To Play piano without TENSION - 4 Piano relaxation Exercises" },
    { id: "wDBQZ7NcYVA", title: "How To Relax Wrist Piano Lesson" },
  ],
  rhythm: [
    { id: "GAS2EryGL_I", title: "How To Work With A Metronome (Beginners Lesson)" },
    { id: "XGKdMYSitAY", title: "How To Use a Metronome (Piano Practice Tips)" },
  ],
  rushing: [
    { id: "9hjC11O0-KE", title: "Stop rushing! How To Stop Rushing In Your Piano Playing" },
    { id: "loUKYG4JIjQ", title: "Struggling With Piano Rhythm? 3 Tempo Tricks That Actually Work" },
  ],
  dragging: [
    { id: "st7pabkIMZQ", title: "Playing with a Metronome: Beginner Piano Exercises for Playing With a Steady Tempo" },
    { id: "nuM32Za6Jew", title: "How to keep your groove and tempo stable" },
  ],
  fingers: [
    { id: "TEi1qaO9GqU", title: "Weak 4th & 5th Fingers? Try These 7 Exercises!" },
    { id: "VwTZpYOTE2U", title: "Strengthen Your Finger Independence on Piano" },
  ],
  general: [
    { id: "p_6y7MPW_Ek", title: "PIANO BASICS Part 2: Hand Shape and Position!" },
    { id: "GAS2EryGL_I", title: "How To Work With A Metronome (Beginners Lesson)" },
  ],
};

export const thumbUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

export function curatedVideos(topics: string[], piece?: string): VideoLink[] {
  const seen = new Set<string>();
  const out: VideoLink[] = [];
  for (const topic of topics.length ? topics : ["general"]) {
    for (const v of (CURATED[topic] ?? []).slice(0, topics.length > 2 ? 1 : 2)) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      out.push({ id: v.id, title: v.title, channel: null, thumbnail: thumbUrl(v.id), url: `https://www.youtube.com/watch?v=${v.id}`, query: topic });
    }
  }
  if (piece?.trim()) {
    const q = `${piece.trim()} piano tutorial beginner slow`;
    out.push({ id: null, title: `Find a tutorial for “${piece.trim()}”`, channel: null, thumbnail: null, url: searchUrl(q), query: q });
  }
  return out;
}
