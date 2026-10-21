import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMetrics, detectPresses } from "./analysis.ts";
import type { Landmark, TrackFrame } from "./types.ts";

test("detectPresses finds evenly spaced strokes", () => {
  const series = [];
  for (let i = 0; i < 100; i++) {
    const t = i / 20;
    // a stroke every 0.5 s
    series.push({ t, v: 0.3 * Math.max(0, Math.sin(2 * Math.PI * t * 2)) });
  }
  const presses = detectPresses(series);
  assert.equal(presses.length, 10);
  const gaps = presses.slice(1).map((p, i) => p.t - presses[i].t);
  gaps.forEach((g) => assert.ok(Math.abs(g - 0.5) < 0.11));
});

function handAt(indexTipY: number): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  lm[0] = { x: 0.5, y: 0.6, z: 0 };
  lm[9] = { x: 0.5, y: 0.4, z: 0 }; // hand size 0.2
  lm[8] = { x: 0.5, y: indexTipY, z: 0 };
  return lm;
}

test("computeMetrics counts index presses and tracks one hand", () => {
  const frames: TrackFrame[] = [];
  for (let i = 0; i < 80; i++) {
    const t = i / 20;
    const dip = Math.max(0, Math.sin(2 * Math.PI * t)) * 0.1; // 1 Hz stroke, 0.5 hand-sizes deep
    frames.push({ t, hands: [{ side: "Right", lm: handAt(0.4 + dip) }] });
  }
  const m = computeMetrics(frames, 4);
  assert.equal(m.hands.length, 1);
  assert.equal(m.hands[0].fingers.index.presses, 4);
  assert.equal(m.trackedShare, 1);
});
