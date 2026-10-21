import type { VideoLink } from "./types";

export function searchUrl(q: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

/** Looks up top videos per query via the YouTube Data API; falls back to plain search links. */
export async function findVideos(queries: string[]): Promise<VideoLink[]> {
  const key = process.env.YOUTUBE_API_KEY;
  const qs = queries.slice(0, 4);
  if (!key) {
    return qs.map((q) => ({ id: null, title: `Search YouTube: ${q}`, channel: null, thumbnail: null, url: searchUrl(q), query: q }));
  }

  const seen = new Set<string>();
  const out: VideoLink[] = [];
  await Promise.all(
    qs.map(async (q) => {
      try {
        const u = new URL("https://www.googleapis.com/youtube/v3/search");
        u.search = new URLSearchParams({
          part: "snippet",
          type: "video",
          maxResults: "3",
          videoEmbeddable: "true",
          safeSearch: "strict",
          q,
          key,
        }).toString();
        const res = await fetch(u);
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as {
          items?: { id: { videoId: string }; snippet: { title: string; channelTitle: string; thumbnails?: { medium?: { url: string } } } }[];
        };
        for (const it of json.items ?? []) {
          const id = it.id.videoId;
          if (seen.has(id)) continue;
          seen.add(id);
          out.push({
            id,
            title: it.snippet.title,
            channel: it.snippet.channelTitle,
            thumbnail: it.snippet.thumbnails?.medium?.url ?? null,
            url: `https://www.youtube.com/watch?v=${id}`,
            query: q,
          });
        }
      } catch {
        out.push({ id: null, title: `Search YouTube: ${q}`, channel: null, thumbnail: null, url: searchUrl(q), query: q });
      }
    }),
  );
  return out;
}
