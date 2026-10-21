import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { TrackFrame } from "./types";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export const SAMPLE_FPS = 20;
export const MAX_SECONDS = 60;

let landmarkerPromise: Promise<HandLandmarker> | null = null;

function getLandmarker() {
  landmarkerPromise ??= FilesetResolver.forVisionTasks(WASM_URL).then((fileset) =>
    HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.4,
      minHandPresenceConfidence: 0.4,
      minTrackingConfidence: 0.4,
    }),
  );
  return landmarkerPromise;
}

function seek(video: HTMLVideoElement, t: number) {
  return new Promise<void>((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.currentTime = t;
  });
}

/**
 * Steps through the video at SAMPLE_FPS and runs hand landmark detection on
 * every sampled frame. Runs entirely in the browser: the video is never uploaded.
 */
export async function trackVideo(
  video: HTMLVideoElement,
  onProgress: (fraction: number) => void,
): Promise<{ frames: TrackFrame[]; duration: number }> {
  const landmarker = await getLandmarker();
  const duration = Math.min(video.duration, MAX_SECONDS);
  const step = 1 / SAMPLE_FPS;
  const frames: TrackFrame[] = [];
  let stamp = 0;

  video.pause();
  for (let t = 0; t < duration; t += step) {
    await seek(video, t);
    stamp = Math.max(stamp + 1, Math.round(t * 1000));
    const res = landmarker.detectForVideo(video, stamp);
    frames.push({
      t,
      hands: res.landmarks.map((lm, i) => ({
        side: res.handedness[i]?.[0]?.categoryName ?? "Hand",
        lm: lm.map((p) => ({ x: p.x, y: p.y, z: p.z })),
      })),
    });
    if (frames.length % 5 === 0) {
      onProgress(t / duration);
      await new Promise((r) => setTimeout(r, 0)); // let the UI paint
    }
  }
  onProgress(1);
  video.currentTime = 0;
  return { frames, duration };
}
