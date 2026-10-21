import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findVideos } from "@/lib/youtube";
import type { Feedback, Metrics } from "@/lib/types";

export const maxDuration = 60;

const SYSTEM = `You are a warm, practical piano teacher coaching a BEGINNER.
You receive measurements extracted automatically from a SIDE-VIEW video of the student's hands (MediaPipe hand tracking), plus a few annotated still frames.
Units: depths and heights are in "hand sizes" (wrist to middle-knuckle distance). Bend is the middle-joint angle in degrees (180 = fully straight finger). Presses are inferred from fingertip downward strokes and are approximate; tracking can miss fingers hidden behind others.
Rules:
- Ground every point in the numbers or the images. Say "it looks like" when inferring. Never invent notes, pieces or measurements.
- Be encouraging, concrete and brief. Beginner vocabulary; explain any technical term.
- If trackedShare is below 0.5 or there are few presses, say the measurement was limited and give filming tips as one improvement.
- Give at most 4 improvements, each with a specific drill. Practice plan: 3-5 short steps for the week.
- youtubeQueries: 2-4 searches for beginner-friendly lessons targeted at the problems found (e.g. "relaxed wrist piano technique beginner"), plus one for the piece if the student named it (e.g. "<piece> piano tutorial beginner slow").
Reply with ONLY a JSON object:
{"pieceGuess": string|null, "summary": string, "strengths": string[], "improvements": [{"title": string, "detail": string, "drill": string}], "practicePlan": string[], "youtubeQueries": string[]}`;

function extractJson(text: string): Feedback {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("no JSON in model reply");
  const raw = JSON.parse(text.slice(start, end + 1)) as Partial<Feedback>;
  return {
    pieceGuess: raw.pieceGuess ?? null,
    summary: raw.summary ?? "",
    strengths: raw.strengths ?? [],
    improvements: raw.improvements ?? [],
    practicePlan: raw.practicePlan ?? [],
    youtubeQueries: raw.youtubeQueries ?? [],
  };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Server is missing ANTHROPIC_API_KEY." }, { status: 500 });
  }

  const body = (await req.json()) as {
    metrics: Metrics;
    piece?: string;
    notes?: string;
    frames?: string[]; // data URLs (jpeg)
    thumbnail?: string;
  };
  if (!body.metrics) return NextResponse.json({ error: "metrics required" }, { status: 400 });

  const images = (body.frames ?? []).slice(0, 3).flatMap((f) => {
    const m = /^data:image\/jpeg;base64,(.+)$/.exec(f);
    return m && m[1].length < 400_000
      ? [{ type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data: m[1] } }]
      : [];
  });

  const anthropic = new Anthropic();
  let feedback: Feedback;
  try {
    const msg = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 2000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            ...images,
            {
              type: "text",
              text: `Level: beginner\nPiece (from student): ${body.piece?.slice(0, 120) || "not given"}\nStudent notes: ${body.notes?.slice(0, 500) || "none"}\n\nMeasurements:\n${JSON.stringify(body.metrics)}`,
            },
          ],
        },
      ],
    });
    const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    feedback = extractJson(text);
  } catch (e) {
    console.error("coaching failed", e);
    return NextResponse.json({ error: "The coach could not produce feedback. Please try again." }, { status: 502 });
  }

  const videos = await findVideos(feedback.youtubeQueries);

  const { data, error } = await supabase
    .from("analyses")
    .insert({
      piece: body.piece?.slice(0, 120) || feedback.pieceGuess,
      level: "beginner",
      duration_seconds: body.metrics.durationSeconds,
      metrics: body.metrics,
      feedback,
      videos,
      thumbnail: body.thumbnail && body.thumbnail.length < 200_000 ? body.thumbnail : null,
    })
    .select("id")
    .single();
  if (error) console.error("save failed", error);

  return NextResponse.json({ id: data?.id ?? null, feedback, videos, saved: !error });
}
