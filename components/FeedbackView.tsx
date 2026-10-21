import type { AnalysisResult, Metrics } from "@/lib/types";
import { FINGERS } from "@/lib/types";
import { FINGER_COLORS } from "@/lib/analysis";
import { computeScores, scoreFor } from "@/lib/scores";
import { VideoCard } from "./VideoCard";

const VERDICT = { good: "Great", ok: "Getting there", work: "Work on this", na: "Not enough data" } as const;

function Scorecard({ metrics }: { metrics: Metrics }) {
  const scores = computeScores(metrics);
  return (
    <div className="scores">
      {scores.map((s) => {
        const level = scoreFor(s.value);
        return (
          <div className={`score ${level}`} key={s.key}>
            <div className="score-top">
              <span className="score-icon">{s.icon}</span>
              <span className="score-num">{s.value ?? "–"}</span>
            </div>
            <div className="score-label">{s.label}</div>
            <div className="meter"><div style={{ width: `${s.value ?? 0}%` }} /></div>
            <div className="score-verdict">{VERDICT[level]}</div>
          </div>
        );
      })}
    </div>
  );
}

function FingerChart({ metrics }: { metrics: Metrics }) {
  const max = Math.max(1, ...metrics.hands.flatMap((h) => FINGERS.map((f) => h.fingers[f].presses)));
  return (
    <div className="fchart-wrap">
      {metrics.hands.map((h) => (
        <div key={h.side}>
          <div className="fchart-title">{h.side} hand · notes per finger</div>
          <div className="fchart">
            {FINGERS.map((f, i) => (
              <div className="fcol" key={f}>
                <span className="fval">{h.fingers[f].presses}</span>
                <div className="fbar" style={{ height: `${Math.max(4, (h.fingers[f].presses / max) * 100)}%`, background: FINGER_COLORS[f] }} />
                <span className="flab">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="muted small">1 = thumb … 5 = pinky</div>
    </div>
  );
}

export function FeedbackView({ result, metrics }: { result: AnalysisResult; metrics?: Metrics }) {
  const { feedback: f, videos } = result;
  return (
    <div className="fb">
      <h2>Your results</h2>
      {metrics && <Scorecard metrics={metrics} />}
      {f.summary && <p className="summary">{f.summary}</p>}

      {f.strengths.length > 0 && (
        <div className="chips">
          {f.strengths.map((s, i) => <span className="chip" key={i}>✓ {s}</span>)}
        </div>
      )}

      {f.improvements.length > 0 && (
        <>
          <h2>What to work on</h2>
          <div className="todo">
            {f.improvements.map((imp, i) => (
              <div className={`todo-card ${i === 0 ? "first" : ""}`} key={i}>
                <div className="todo-head">
                  <span className="todo-icon">{imp.icon ?? "🎯"}</span>
                  <strong>{imp.title}</strong>
                  {i === 0 && <span className="badge">Start here</span>}
                </div>
                <p className="why">{imp.detail}</p>
                <p className="do"><span>Try</span> {imp.drill}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {videos.length > 0 && (
        <>
          <h2>Watch &amp; learn</h2>
          <div className="vgrid">
            {videos.map((v, i) => <VideoCard key={v.id ?? i} v={v} />)}
          </div>
        </>
      )}

      {f.practicePlan.length > 0 && (
        <>
          <h2>This week</h2>
          <ol className="plan">
            {f.practicePlan.map((s, i) => <li key={i}><b>{i + 1}</b>{s}</li>)}
          </ol>
        </>
      )}

      {metrics && (
        <>
          <h2>Your fingers</h2>
          <FingerChart metrics={metrics} />
          <details className="more">
            <summary>Show the detailed numbers</summary>
            <p className="muted small">
              {metrics.totalPresses} key strokes over {metrics.durationSeconds}s · tracked {Math.round(metrics.trackedShare * 100)}% of frames · {metrics.rushDragNote}. Estimates from video.
            </p>
            {metrics.hands.map((h) => (
              <table key={h.side}>
                <caption style={{ textAlign: "left", fontWeight: 600 }}>{h.side} hand</caption>
                <thead><tr><th>Finger</th><th>Strokes</th><th>Avg bend</th><th>Flat %</th></tr></thead>
                <tbody>
                  {FINGERS.map((n) => (
                    <tr key={n}><td>{n}</td><td>{h.fingers[n].presses}</td><td>{h.fingers[n].avgBend}°</td><td>{Math.round(h.fingers[n].flatShare * 100)}%</td></tr>
                  ))}
                </tbody>
              </table>
            ))}
          </details>
        </>
      )}
    </div>
  );
}
