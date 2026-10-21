import { test } from "node:test";
import assert from "node:assert/strict";
import { coach } from "./coach.ts";
import type { FingerStats, Metrics } from "./types.ts";

const f = (over: Partial<FingerStats> = {}): FingerStats => ({ presses: 6, avgDepth: 0.3, avgBend: 140, flatShare: 0.05, ...over });
const base: Metrics = {
  durationSeconds: 20, sampledFrames: 400, trackedShare: 0.9, totalPresses: 30, pressesPerSecond: 1.5,
  timingVariation: 0.2, rushDragNote: "tempo stays roughly constant",
  hands: [{ side: "Right", framesTracked: 360, avgWristRise: 0.1, wristDropShare: 0, wristJitter: 0.1,
    fingers: { thumb: f(), index: f(), middle: f(), ring: f(), pinky: f() } }],
};

test("steady curved playing yields strengths and no issues", () => {
  const r = coach(base);
  assert.equal(r.improvements.length, 0);
  assert.ok(r.strengths.length >= 3);
});

test("flat fingers, dropped wrist and rushing are flagged", () => {
  const m: Metrics = structuredClone(base);
  const fl = f({ flatShare: 0.6 });
  m.hands[0].fingers = { thumb: fl, index: fl, middle: fl, ring: fl, pinky: fl };
  m.hands[0].wristDropShare = 0.5;
  m.rushDragNote = "speeds up over the clip (gaps shrink 30%) - rushing";
  const titles = coach(m, "Fur Elise").improvements.map((i) => i.title);
  assert.ok(titles.includes("Curve your fingers more"));
  assert.ok(titles.includes("Lift your wrist"));
  assert.ok(coach(m, "Fur Elise").youtubeQueries.some((q) => q.includes("Fur Elise")));
});
