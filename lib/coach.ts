import type { Feedback, Metrics } from "./types.ts";
import { FINGERS } from "./types.ts";

type Improvement = Feedback["improvements"][number] & { query: string };

/**
 * Free, rule-based coaching from the measurements. Used when no ANTHROPIC_API_KEY
 * is configured. Thresholds are rough beginner-friendly heuristics, not gospel.
 */
export function coach(m: Metrics, piece?: string): Feedback {
  const strengths: string[] = [];
  const issues: Improvement[] = [];
  const hands = m.hands;

  if (m.trackedShare < 0.5 || m.totalPresses < 4) {
    issues.push({
      title: "Help me see your hands",
      icon: "📹",
      topic: "general",
      detail: `Hands tracked in only ${Math.round(m.trackedShare * 100)}% of the clip, so tips are less certain.`,
      drill: "Film from the side in good light, both hands in frame, 15-30 seconds.",
      query: "how to film piano practice video for feedback",
    });
  } else {
    strengths.push("Clear video: hands tracked well");
  }

  const avgFlat = (side: string) => {
    const h = hands.find((x) => x.side === side)!;
    const fs = FINGERS.filter((f) => f !== "thumb").map((f) => h.fingers[f].flatShare);
    return fs.reduce((a, b) => a + b, 0) / fs.length;
  };
  const flatHands = hands.filter((h) => avgFlat(h.side) > 0.35);
  if (flatHands.length) {
    issues.push({
      title: "Curve your fingers more",
      icon: "🖐️",
      topic: "hand",
      detail: `Your ${flatHands.map((h) => h.side.toLowerCase()).join(" & ")} fingers were nearly straight ${Math.round(Math.max(...flatHands.map((h) => avgFlat(h.side))) * 100)}% of the time. Straight fingers are slower and tire out.`,
      drill: "Hold a small ball shape over the keys, then play 5-finger patterns slowly.",
      query: "piano hand position curved fingers beginner",
    });
  } else if (hands.length) {
    strengths.push("Nicely curved fingers");
  }

  const dropped = hands.filter((h) => h.wristDropShare > 0.3);
  if (dropped.length) {
    issues.push({
      title: "Lift your wrist",
      icon: "🤲",
      topic: "wrist",
      detail: `Your ${dropped.map((h) => h.side.toLowerCase()).join(" & ")} wrist dipped below your knuckles ${Math.round(Math.max(...dropped.map((h) => h.wristDropShare)) * 100)}% of the time. That strains the forearm.`,
      drill: "Keep a straight line from elbow to knuckles. Play a slow 5-note scale.",
      query: "piano wrist position posture beginner",
    });
  } else if (hands.length) {
    strengths.push("Good wrist height");
  }

  const jittery = hands.filter((h) => h.wristJitter > 0.35);
  if (jittery.length) {
    issues.push({
      title: "Relax and move less",
      icon: "😌",
      topic: "tension",
      detail: "Your wrist bobbed a lot, a sign of tension or reaching.",
      drill: "Play slowly, shoulders loose, exhale before each phrase. Let fingers do the work.",
      query: "piano relaxation tension free playing beginner",
    });
  }

  if (m.totalPresses >= 8) {
    if (m.timingVariation > 0.5) {
      issues.push({
        title: "Steady your rhythm",
        icon: "🥁",
        topic: "rhythm",
        detail: "Gaps between your notes vary quite a bit.",
        drill: "Metronome at 60-70 bpm, one note per click. Speed up only when easy.",
        query: "piano rhythm practice with metronome beginner",
      });
    } else if (m.timingVariation < 0.3) {
      strengths.push("Even note timing");
    }
    if (/rushing/.test(m.rushDragNote)) {
      issues.push({
        title: "Don't speed up",
        icon: "🏃",
        topic: "rushing",
        detail: "You sped up as the clip went on.",
        drill: "Start slower than feels right. Count out loud for the first 2 bars.",
        query: "how to stop rushing piano beginner",
      });
    } else if (/dragging/.test(m.rushDragNote)) {
      issues.push({
        title: "Don't slow down",
        icon: "🐢",
        topic: "dragging",
        detail: "You slowed down as the clip went on.",
        drill: "Practise in small chunks with a metronome, then link them.",
        query: "piano keep steady tempo beginner",
      });
    } else if (/constant/.test(m.rushDragNote)) {
      strengths.push("Steady tempo throughout");
    }
  }

  // Weak outer fingers: compare ring/pinky stroke depth to index/middle.
  for (const h of hands) {
    const strong = (h.fingers.index.avgDepth + h.fingers.middle.avgDepth) / 2;
    const weak = (h.fingers.ring.avgDepth + h.fingers.pinky.avgDepth) / 2;
    if (strong > 0 && h.fingers.index.presses + h.fingers.middle.presses >= 4 && weak < strong * 0.6) {
      issues.push({
        title: `Wake up your ${h.side.toLowerCase()} ring & pinky`,
        icon: "💪",
        topic: "fingers",
        detail: "They moved much less than your index and middle. Very common for beginners.",
        drill: "Hold all 5 keys silently, then tap just ring, then pinky, 10 times each.",
        query: "piano finger independence exercises beginner",
      });
      break;
    }
  }

  const top = issues.slice(0, 4);
  const queries = top.map((i) => i.query);
  if (piece?.trim()) queries.push(`${piece.trim()} piano tutorial beginner slow`);
  if (!queries.length) queries.push("beginner piano technique lesson");

  const summary = top.length
    ? `${top.length} thing${top.length > 1 ? "s" : ""} to work on. Start with #1.`
    : "Nothing stood out. Keep practising, or send a longer clip.";

  return {
    pieceGuess: piece?.trim() || null,
    summary,
    strengths,
    improvements: top.map(({ title, detail, drill, icon, topic }) => ({ title, detail, drill, icon, topic })),
    practicePlan: [
      "Warm up: slow 5-finger patterns (3 min)",
      top[0] ? `Drill: ${top[0].title.toLowerCase()} (5 min)` : "Play in 4-bar chunks, hands separate",
      "Metronome pass at a slow tempo",
      "Film again, same angle, and compare",
    ],
    youtubeQueries: queries,
    topics: top.map((i) => i.topic!).filter(Boolean),
  };
}
