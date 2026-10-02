import type { AgentMatrix as Matrix } from "../types";
import { agentLabel } from "../labels";
import { ErrorNotice } from "./ErrorNotice";

interface Props {
  matrix: Matrix | null;
  error: unknown;
  onRetry: () => void;
}

export function AgentMatrix({ matrix, error, onRetry }: Props) {
  const agents = matrix ? Object.keys(matrix) : [];
  const tools = matrix ? Array.from(new Set(Object.values(matrix).flat())) : [];

  return (
    <section className="panel panel--quiet" aria-labelledby="matrix-title">
      <header className="panel__head">
        <h2 id="matrix-title">Permisos agente → herramienta</h2>
        <p className="panel__sub">Cada sub-agente solo puede invocar las herramientas autorizadas.</p>
      </header>
      {error ? (
        <ErrorNotice error={error} title="No se cargó la matriz de permisos" onRetry={onRetry} />
      ) : !matrix ? (
        <div className="skeleton-block" aria-busy="true" aria-label="Cargando permisos" />
      ) : agents.length === 0 ? (
        <p className="muted small">No hay agentes registrados.</p>
      ) : (
        <ul className="perm-list">
          {agents.map((a) => (
            <li key={a} className="perm">
              <div className="perm__agent">
                <span className="perm__name">{agentLabel(a)}</span>
                <span className="mono xsmall muted">{a}</span>
              </div>
              <span className="perm__arrow" aria-hidden="true">
                →
              </span>
              <div className="perm__tools">
                {matrix[a].length === 0 ? (
                  <span className="muted small">Sin herramientas</span>
                ) : (
                  matrix[a].map((t) => (
                    <code key={t} className="tool-tag">
                      {t}
                    </code>
                  ))
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {tools.length > 0 && (
        <p className="xsmall muted perm__foot">
          {agents.length} agentes · {tools.length} herramientas registradas
        </p>
      )}
    </section>
  );
}
