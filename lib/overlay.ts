import { FINGERS, type FingerName, type TrackFrame } from "./types";
import { FINGER_COLORS, FINGER_TIPS, HAND_CONNECTIONS, frameAt } from "./analysis";

const TRAIL_SECONDS = 0.6;

/** Draws the skeleton and fingertip trails for time `t` onto a canvas the size of the video. */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  frames: TrackFrame[],
  t: number,
  opts: { trails: boolean; skeleton: boolean },
) {
  const { width: w, height: h } = ctx.canvas;
  ctx.clearRect(0, 0, w, h);
  const frame = frameAt(frames, t);
  if (!frame) return;

  if (opts.skeleton) {
    ctx.lineWidth = Math.max(2, w / 400);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    for (const hand of frame.hands) {
      ctx.beginPath();
      for (const [a, b] of HAND_CONNECTIONS) {
        ctx.moveTo(hand.lm[a].x * w, hand.lm[a].y * h);
        ctx.lineTo(hand.lm[b].x * w, hand.lm[b].y * h);
      }
      ctx.stroke();
    }
  }

  if (opts.trails) {
    const recent = frames.filter((f) => f.t <= frame.t && f.t >= frame.t - TRAIL_SECONDS);
    for (const name of FINGERS as readonly FingerName[]) {
      const idx = FINGER_TIPS[name];
      for (const side of new Set(frame.hands.map((hd) => hd.side))) {
        ctx.beginPath();
        ctx.strokeStyle = FINGER_COLORS[name];
        ctx.lineWidth = Math.max(3, w / 250);
        ctx.lineCap = "round";
        let started = false;
        for (const f of recent) {
          const hd = f.hands.find((x) => x.side === side);
          if (!hd) continue;
          const p = hd.lm[idx];
          if (!started) {
            ctx.moveTo(p.x * w, p.y * h);
            started = true;
          } else ctx.lineTo(p.x * w, p.y * h);
        }
        ctx.stroke();
      }
    }
  }

  for (const hand of frame.hands) {
    for (const name of FINGERS as readonly FingerName[]) {
      const p = hand.lm[FINGER_TIPS[name]];
      ctx.beginPath();
      ctx.fillStyle = FINGER_COLORS[name];
      ctx.arc(p.x * w, p.y * h, Math.max(4, w / 160), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
