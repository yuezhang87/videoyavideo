# Piano Coach

Upload a side-view clip of your piano playing and get:

1. **Finger tracking overlay** - hand skeleton and per-finger trails (MediaPipe Hands, runs in your browser; the video is never uploaded).
2. **Beginner-friendly coaching** - Claude reads the extracted measurements plus a few annotated frames and gives strengths, fixes, drills and a practice plan.
3. **YouTube lessons** matched to the problems found.
4. **Saved history** per user (Supabase).

## Setup

1. `npm install`
2. Create a Supabase project, run `supabase/migrations/0001_analyses.sql` in the SQL editor.
3. Copy `.env.example` to `.env.local` and fill it in:
   - Supabase URL + anon key (free)
   - `ANTHROPIC_API_KEY` (pay-as-you-go; a few cents per analysis)
   - `YOUTUBE_API_KEY` (free quota; optional, falls back to YouTube search links)
4. `npm run dev`, then deploy to Vercel with the same env vars.

`npm test` runs the analysis unit tests.

## How it works

`lib/tracker.ts` steps through the clip at 20 fps and detects 21 landmarks per hand. `lib/analysis.ts` turns fingertip motion into key-stroke events, timing steadiness, finger bend and wrist height. `app/api/analyze` sends those numbers and 3 annotated frames to Claude, looks up YouTube videos, and stores the result.

## Roadmap

Slow-motion loops on problem bars, audio note transcription, reference-video comparison, progress charts, sheet-music view.
