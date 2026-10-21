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
      title: "Help me see your hands better",
      detail: `I could only follow your hands in ${Math.round(m.trackedShare * 100)}% of the clip and found ${m.totalPresses} clear key strokes, so the other tips are less certain.`,
      drill: "Film from the side with good light, keep both hands fully in frame, and avoid sleeves covering the wrists. Try a 15-30 second clip.",
      query: "how to film piano practice video for feedback",
    });
  } else {
    strengths.push(`Your hands were tracked clearly in ${Math.round(m.trackedShare * 100)}% of the clip, so these numbers are fairly reliable.`);
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
      detail: `Your ${flatHands.map((h) => h.side.toLowerCase()).join(" and ")} fingers were nearly straight in about ${Math.round(Math.max(...flatHands.map((h) => avgFlat(h.side))) * 100)}% of frames. Straight fingers make playing slower and more tiring.`,
      drill: "Rest your hand on your knee: notice the natural curve. Place your hand on the keys like you're holding a small ball, then play five-finger patterns slowly keeping that shape.",
      query: "piano hand position curved fingers beginner",
    });
  } else if (hands.length) {
    strengths.push("Your fingers keep a nicely curved shape.");
  }

  const dropped = hands.filter((h) => h.wristDropShare > 0.3);
  if (dropped.length) {
    issues.push({
      title: "Keep your wrists level with your hand",
      detail: `Your ${dropped.map((h) => h.side.toLowerCase()).join(" and ")} wrist sank below your knuckles in about ${Math.round(Math.max(...dropped.map((h) => h.wristDropShare)) * 100)}% of frames. A dropped wrist strains the forearm and limits finger speed.`,
      drill: "Imagine a straight line from elbow to knuckles. Play a slow five-note scale while a pencil rests on the back of your hand; try not to let it tilt.",
      query: "piano wrist position posture beginner",
    });
  } else if (hands.length) {
    strengths.push("Your wrist height stays good relative to your knuckles.");
  }

  const jittery = hands.filter((h) => h.wristJitter > 0.35);
  if (jittery.length) {
    issues.push({
      title: "Quieten the extra hand movement",
      detail: "Your wrist moved up and down a lot while playing, which can be a sign of tension or reaching for notes.",
      drill: "Play a simple pattern very slowly and keep your shoulders loose. Exhale before each phrase. Aim for the finger doing the work, not the whole arm.",
      query: "piano relaxation tension free playing beginner",
    });
  }

  if (m.totalPresses >= 8) {
    if (m.timingVariation > 0.5) {
      issues.push({
        title: "Steady your rhythm",
        detail: `The gaps between your notes vary quite a bit (variation score ${m.timingVariation}; under 0.3 is very steady). Some of that is normal rhythm in music, but evenness is worth practising.`,
        drill: "Pick a short passage, set a metronome to a slow speed (60-70 bpm) and play one note per click. Speed up only when it feels easy.",
        query: "piano rhythm practice with metronome beginner",
      });
    } else if (m.timingVariation < 0.3) {
      strengths.push("Your note timing is nice and even.");
    }
    if (/rushing/.test(m.rushDragNote)) {
      issues.push({
        title: "Don't speed up as you go",
        detail: `It looks like your clip ${m.rushDragNote}.`,
        drill: "Start slower than feels necessary and use a metronome. Count out loud for the first two bars.",
        query: "how to stop rushing piano beginner",
      });
    } else if (/dragging/.test(m.rushDragNote)) {
      issues.push({
        title: "Keep your tempo from slowing down",
        detail: `It looks like your clip ${m.rushDragNote}.`,
        drill: "Practise the passage in small chunks with a metronome, then link them. Keep your eyes a beat ahead.",
        query: "piano keep steady tempo beginner",
      });
    } else if (/constant/.test(m.rushDragNote)) {
      strengths.push("Your tempo stayed steady through the clip.");
    }
  }

  // Weak outer fingers: compare ring/pinky stroke depth to index/middle.
  for (const h of hands) {
    const strong = (h.fingers.index.avgDepth + h.fingers.middle.avgDepth) / 2;
    const weak = (h.fingers.ring.avgDepth + h.fingers.pinky.avgDepth) / 2;
    if (strong > 0 && h.fingers.index.presses + h.fingers.middle.presses >= 4 && weak < strong * 0.6) {
      issues.push({
        title: `Wake up your ${h.side.toLowerCase()} ring and little finger`,
        detail: "Those fingers moved noticeably less than your index and middle fingers. That's very common for beginners.",
        drill: "Hold down all five keys silently, then lift and tap just the ring finger, then the pinky, 10 times each. Keep the others still and relaxed.",
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
    ? `I found ${top.length} thing${top.length > 1 ? "s" : ""} to work on${strengths.length ? ` and ${strengths.length} thing${strengths.length > 1 ? "s" : ""} going well` : ""}. Start with the first one: small habits like this make every piece easier. These tips come from automatic measurements, so treat them as a guide.`
    : "Nothing stood out as a problem in this clip. Keep practising slowly and send me a longer or different passage to look at.";

  return {
    pieceGuess: piece?.trim() || null,
    summary,
    strengths,
    improvements: top.map(({ title, detail, drill }) => ({ title, detail, drill })),
    practicePlan: [
      "Day 1-2: warm up with slow five-finger patterns, curved fingers, loose wrists (3 minutes).",
      top[0] ? `Day 3-4: focus drill - ${top[0].title.toLowerCase()} (5 minutes).` : "Day 3-4: play your piece in 4-bar chunks, hands separate.",
      "Day 5: play the passage with a metronome at a comfortable slow tempo.",
      "Day 6-7: record another clip from the same side angle and compare.",
    ],
    youtubeQueries: queries,
  };
}
