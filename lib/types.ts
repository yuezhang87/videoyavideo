export type Landmark = { x: number; y: number; z: number };

export type HandFrame = {
  /** "Left" | "Right" as reported by MediaPipe (image is not mirrored). */
  side: string;
  lm: Landmark[]; // 21 points
};

export type TrackFrame = {
  t: number; // seconds
  hands: HandFrame[];
};

export const FINGERS = ["thumb", "index", "middle", "ring", "pinky"] as const;
export type FingerName = (typeof FINGERS)[number];

export type FingerStats = {
  presses: number;
  /** average stroke depth, in hand-size units */
  avgDepth: number;
  /** average finger bend at the middle joint, degrees (180 = straight) */
  avgBend: number;
  /** share of frames the finger is nearly straight */
  flatShare: number;
};

export type HandMetrics = {
  side: string;
  framesTracked: number;
  fingers: Record<FingerName, FingerStats>;
  /** wrist height relative to knuckles, hand-size units (negative = wrist below knuckles) */
  avgWristRise: number;
  wristDropShare: number; // share of frames wrist sits below the knuckles
  wristJitter: number; // std of wrist height, hand-size units
};

export type Metrics = {
  durationSeconds: number;
  sampledFrames: number;
  trackedShare: number;
  totalPresses: number;
  pressesPerSecond: number;
  /** coefficient of variation of gaps between consecutive presses (lower = steadier) */
  timingVariation: number;
  rushDragNote: string;
  hands: HandMetrics[];
};

export type Feedback = {
  pieceGuess: string | null;
  summary: string;
  strengths: string[];
  improvements: { title: string; detail: string; drill: string; icon?: string; topic?: string }[];
  practicePlan: string[];
  youtubeQueries: string[];
  /** curated-video topics (free mode) */
  topics?: string[];
};

export type VideoLink = {
  id: string | null;
  title: string;
  channel: string | null;
  thumbnail: string | null;
  url: string;
  query: string;
};

export type AnalysisResult = {
  feedback: Feedback;
  videos: VideoLink[];
};
