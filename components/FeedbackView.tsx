import type { AnalysisResult, Metrics } from "@/lib/types";
import { FINGERS } from "@/lib/types";

export function FeedbackView({ result, metrics }: { result: AnalysisResult; metrics?: Metrics }) {
  const { feedback: f, videos } = result;
  return (
    <div>
      <h2>Your coaching notes</h2>
      <div className="card">
        {f.pieceGuess && <p className="muted">Piece: {f.pieceGuess}</p>}
        <p>{f.summary}</p>
      </div>

      {f.strengths.length > 0 && (
        <div className="card">
          <strong>What’s going well</strong>
          <ul>{f.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}

      {f.improvements.map((imp, i) => (
        <div className="card" key={i}>
          <strong>{i + 1}. {imp.title}</strong>
          <p>{imp.detail}</p>
          <div className="drill"><strong>Try this:</strong> {imp.drill}</div>
        </div>
      ))}

      {f.practicePlan.length > 0 && (
        <div className="card">
          <strong>This week’s practice plan</strong>
          <ol>{f.practicePlan.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>
      )}

      {videos.length > 0 && (
        <>
          <h2>Learn from these videos</h2>
          <div className="grid">
            {videos.map((v, i) => (
              <a key={i} className="vid card" href={v.url} target="_blank" rel="noopener noreferrer">
                {v.thumbnail && <img src={v.thumbnail} alt="" loading="lazy" />}
                <div><strong>{v.title}</strong></div>
                <small>{v.channel ?? "YouTube search"} · for “{v.query}”</small>
              </a>
            ))}
          </div>
        </>
      )}

      {metrics && (
        <>
          <h2>The numbers</h2>
          <div className="card">
            <p className="muted">
              {metrics.totalPresses} key strokes detected over {metrics.durationSeconds}s ({metrics.pressesPerSecond}/s),
              hands tracked in {Math.round(metrics.trackedShare * 100)}% of frames. Timing: {metrics.rushDragNote}.
              These are estimates from video, not a perfect measurement.
            </p>
            {metrics.hands.map((h) => (
              <table key={h.side}>
                <caption style={{ textAlign: "left", fontWeight: 600 }}>{h.side} hand</caption>
                <thead><tr><th>Finger</th><th>Strokes</th><th>Avg bend</th><th>Flat %</th></tr></thead>
                <tbody>
                  {FINGERS.map((n) => (
                    <tr key={n}>
                      <td>{n}</td>
                      <td>{h.fingers[n].presses}</td>
                      <td>{h.fingers[n].avgBend}°</td>
                      <td>{Math.round(h.fingers[n].flatShare * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
