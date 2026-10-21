import type {
  FingerName,
  FingerStats,
  HandMetrics,
  Landmark,
  Metrics,
  TrackFrame,
} from "./types.ts";
import { FINGERS } from "./types.ts";

// MediaPipe hand landmark indices
const TIP = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 } as const;
const PIP = { thumb: 3, index: 6, middle: 10, ring: 14, pinky: 18 } as const;
const MCP = { thumb: 2, index: 5, middle: 9, ring: 13, pinky: 17 } as const;
const DIP = { thumb: 3, index: 7, middle: 11, ring: 15, pinky: 19 } as const;
const KNUCKLES = [5, 9, 13, 17];

export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export const FINGER_COLORS: Record<FingerName, string> = {
  thumb: "#ff6b6b",
  index: "#ffa94d",
  middle: "#ffd43b",
  ring: "#51cf66",
  pinky: "#4dabf7",
};

export const FINGER_LABELS: Record<FingerName, string> = {
  thumb: "1 · thumb",
  index: "2 · index",
  middle: "3 · middle",
  ring: "4 · ring",
  pinky: "5 · pinky",
};

const dist = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y);

function angleDeg(a: Landmark, b: Landmark, c: Landmark): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const n = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (n === 0) return 180;
  const cos = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / n));
  return (Math.acos(cos) * 180) / Math.PI;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const std = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

/** Hand size = wrist to middle-finger knuckle. Makes every measure camera-distance independent. */
function handSize(lm: Landmark[]) {
  return dist(lm[0], lm[9]) || 1e-6;
}

/**
 * Detects key strokes as local maxima of the fingertip's downward position
 * (image y grows downward) that are deeper than `minDepth` hand-sizes relative
 * to the surrounding baseline. Returns timestamps and depths.
 */
export function detectPresses(
  series: { t: number; v: number | null }[],
  minDepth = 0.12,
  minGap = 0.12,
): { t: number; depth: number }[] {
  const pts = series.filter((p): p is { t: number; v: number } => p.v !== null);
  const out: { t: number; depth: number }[] = [];
  const win = 6;
  for (let i = 1; i < pts.length - 1; i++) {
    if (!(pts[i].v >= pts[i - 1].v && pts[i].v > pts[i + 1].v)) continue;
    const lo = Math.max(0, i - win);
    const hi = Math.min(pts.length - 1, i + win);
    let base = Infinity;
    for (let k = lo; k <= hi; k++) base = Math.min(base, pts[k].v);
    const depth = pts[i].v - base;
    if (depth < minDepth) continue;
    const last = out[out.length - 1];
    if (last && pts[i].t - last.t < minGap) {
      if (depth > last.depth) out[out.length - 1] = { t: pts[i].t, depth };
      continue;
    }
    out.push({ t: pts[i].t, depth });
  }
  return out;
}

export function computeMetrics(frames: TrackFrame[], durationSeconds: number): Metrics {
  const sides = new Set<string>();
  frames.forEach((f) => f.hands.forEach((h) => sides.add(h.side)));

  const allPressTimes: number[] = [];
  const hands: HandMetrics[] = [];

  for (const side of sides) {
    const perFrame = frames.map((f) => ({ t: f.t, h: f.hands.find((h) => h.side === side) ?? null }));
    const tracked = perFrame.filter((p) => p.h);

    const fingers = {} as Record<FingerName, FingerStats>;
    for (const name of FINGERS) {
      const series = perFrame.map((p) => ({
        t: p.t,
        v: p.h ? (p.h.lm[TIP[name]].y - p.h.lm[0].y) / handSize(p.h.lm) : null,
      }));
      const presses = detectPresses(series);
      presses.forEach((p) => allPressTimes.push(p.t));

      const bends = tracked.map((p) =>
        angleDeg(p.h!.lm[MCP[name]], p.h!.lm[PIP[name]], p.h!.lm[DIP[name]]),
      );
      fingers[name] = {
        presses: presses.length,
        avgDepth: round(mean(presses.map((p) => p.depth))),
        avgBend: round(mean(bends), 0),
        flatShare: round(bends.filter((b) => b > 168).length / Math.max(1, bends.length)),
      };
    }

    const rises = tracked.map((p) => {
      const kn = mean(KNUCKLES.map((i) => p.h!.lm[i].y));
      return (kn - p.h!.lm[0].y) / handSize(p.h!.lm); // positive = wrist above knuckles
    });
    const wrists = tracked.map((p) => p.h!.lm[0].y / handSize(p.h!.lm));

    hands.push({
      side,
      framesTracked: tracked.length,
      fingers,
      avgWristRise: round(mean(rises)),
      wristDropShare: round(rises.filter((r) => r < -0.05).length / Math.max(1, rises.length)),
      wristJitter: round(std(wrists)),
    });
  }

  allPressTimes.sort((a, b) => a - b);
  const gaps = allPressTimes.slice(1).map((t, i) => t - allPressTimes[i]).filter((g) => g > 0.06);
  const cv = gaps.length > 2 ? std(gaps) / (mean(gaps) || 1) : 0;

  let rushDragNote = "not enough notes detected to judge tempo drift";
  if (gaps.length >= 8) {
    const half = Math.floor(gaps.length / 2);
    const first = mean(gaps.slice(0, half));
    const second = mean(gaps.slice(half));
    const change = (second - first) / first;
    if (change < -0.12) rushDragNote = `speeds up over the clip (gaps shrink ${Math.round(-change * 100)}%) - rushing`;
    else if (change > 0.12) rushDragNote = `slows down over the clip (gaps grow ${Math.round(change * 100)}%) - dragging`;
    else rushDragNote = "tempo stays roughly constant";
  }

  const trackedFrames = frames.filter((f) => f.hands.length > 0).length;
  return {
    durationSeconds: round(durationSeconds, 1),
    sampledFrames: frames.length,
    trackedShare: round(trackedFrames / Math.max(1, frames.length)),
    totalPresses: allPressTimes.length,
    pressesPerSecond: round(allPressTimes.length / Math.max(1, durationSeconds), 1),
    timingVariation: round(cv),
    rushDragNote,
    hands,
  };
}

function round(n: number, digits = 2) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** Nearest tracked frame to time t (frames are sorted by t). */
export function frameAt(frames: TrackFrame[], t: number): TrackFrame | null {
  if (!frames.length) return null;
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  const a = frames[Math.max(0, lo - 1)];
  const b = frames[lo];
  return Math.abs(a.t - t) <= Math.abs(b.t - t) ? a : b;
}

export const FINGER_TIPS = TIP;
