import type { Step } from "../types";
import { STEP_STATUS_LABELS, agentLabel, stepLabel, tone } from "../labels";

function hasOutput(o: unknown): boolean {
  if (o === null || o === undefined) return false;
  if (typeof o === "object") return Object.keys(o as object).length > 0;
  return true;
}

export function Timeline({ steps }: { steps: Step[] }) {
  if (steps.length === 0) {
    return <p className="muted small">El orquestador aún no registró pasos.</p>;
  }
  const total = steps.reduce((acc, s) => acc + (s.duration_ms || 0), 0);

  return (
    <>
      <ol className="timeline">
        {steps.map((s, i) => {
          const t = tone(s.status);
          return (
            <li key={`${s.agent}-${s.step}-${i}`} className={`tl tl--${t}`}>
              <span className="tl__marker" aria-hidden="true">
                {t === "ok" ? "✓" : t === "bad" ? "✕" : t === "warn" ? "!" : "–"}
              </span>
              <div className="tl__card">
                <div className="tl__top">
                  <div>
                    <h4 className="tl__title">{stepLabel(s.step)}</h4>
                    <p className="tl__agent">
                      {agentLabel(s.agent)}
                      {s.tool && (
                        <>
                          {" "}
                          <span aria-hidden="true">·</span> <code className="tool-tag">{s.tool}</code>
                        </>
                      )}
                    </p>
                  </div>
                  <span className={`pill pill--${t}`}>{STEP_STATUS_LABELS[s.status] ?? s.status}</span>
                </div>

                <dl className="tl__meta">
                  <div>
                    <dt>Intentos</dt>
                    <dd className={s.attempts > 1 ? "tl__retry" : undefined}>{s.attempts}</dd>
                  </div>
                  <div>
                    <dt>Duración</dt>
                    <dd>{s.duration_ms} ms</dd>
                  </div>
                </dl>

                {s.notes && <p className="tl__notes">{s.notes}</p>}

                {hasOutput(s.output) && (
                  <details className="json">
                    <summary>Ver salida de la herramienta</summary>
                    <pre tabIndex={0}>{JSON.stringify(s.output, null, 2)}</pre>
                  </details>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="xsmall muted timeline__foot">
        {steps.length} pasos · {total} ms acumulados
      </p>
    </>
  );
}
