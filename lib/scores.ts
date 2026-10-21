import type { Metrics } from "./types";

export type Score = {
  key: string;
  icon: string;
  label: string;
  /** 0-100, or null when there isn't enough data */
  value: number | null;
  hint: string;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function scoreFor(value: number | null): "good" | "ok" | "work" | "na" {
  if (value === null) return "na";
  return value >= 75 ? "good" : value >= 50 ? "ok" : "work";
}

export function computeScores(m: Metrics): Score[] {
  const hands = m.hands;
  const flat = avg(hands.map((h) => avg((["index", "middle", "ring", "pinky"] as const).map((f) => h.fingers[f].flatShare))));
  const drop = avg(hands.map((h) => h.wristDropShare));

  const ratios = hands.flatMap((h) => {
    const strong = (h.fingers.index.avgDepth + h.fingers.middle.avgDepth) / 2;
    const weak = (h.fingers.ring.avgDepth + h.fingers.pinky.avgDepth) / 2;
    return strong > 0 && h.fingers.index.presses + h.fingers.middle.presses >= 4 ? [Math.min(1, weak / strong)] : [];
  });

  const enough = m.totalPresses >= 8;
  return [
    { key: "shape", icon: "🖐️", label: "Finger shape", value: hands.length ? clamp(100 - flat * 130) : null, hint: "Curved, relaxed fingers" },
    { key: "wrist", icon: "🤲", label: "Wrist height", value: hands.length ? clamp(100 - drop * 150) : null, hint: "Level with your knuckles" },
    { key: "rhythm", icon: "🥁", label: "Steady rhythm", value: enough ? clamp(100 - (m.timingVariation - 0.2) * 140) : null, hint: enough ? "Even gaps between notes" : "Not enough notes to judge" },
    { key: "even", icon: "💪", label: "All fingers active", value: ratios.length ? clamp(ratios.reduce((a, b) => a + b, 0) / ratios.length * 110) : null, hint: "Ring & pinky keep up" },
  ];
}
