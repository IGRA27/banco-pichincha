import { useState } from "react";
import type { ResolveBody, Session } from "../types";
import {
  DECISION_LABELS,
  ROLE_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS,
  agentLabel,
  formatDateTime,
  formatTime,
  productLabel,
  tone,
} from "../labels";
import { Timeline } from "./Timeline";
import { ReviewPanel } from "./ReviewPanel";

interface Props {
  session: Session;
  refreshing: boolean;
  onRefresh: () => void;
  onResolve: (body: ResolveBody) => Promise<void>;
}

export function SessionResult({ session, refreshing, onRefresh, onResolve }: Props) {
  const [copied, setCopied] = useState(false);
  const decisionTone = tone(session.decision ?? session.status);
  const decisionText = session.decision ? DECISION_LABELS[session.decision] ?? session.decision : "Sin decisión";

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(session.session_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <article className="result" aria-labelledby="result-title">
      <header className={`verdict verdict--${decisionTone}`}>
        <div className="verdict__main">
          <p className="verdict__kicker">Decisión del orquestador</p>
          <h2 id="result-title" className="verdict__decision">
            {decisionText}
          </h2>
          <p className="verdict__who">
            {session.prospect.prospect_name} · <span className="mono">{session.prospect.document_id}</span> ·{" "}
            {productLabel(session.prospect.product)}
          </p>
        </div>
        <div className="verdict__side">
          <span className={`pill pill--${tone(session.status)} pill--lg`}>
            {STATUS_LABELS[session.status] ?? session.status}
          </span>
          <button type="button" className="linkish mono xsmall" onClick={copyId} title="Copiar ID de sesión">
            {copied ? "ID copiado" : `Sesión ${session.session_id.slice(0, 8)}…`}
          </button>
          {session.status === "IN_PROGRESS" && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? "Actualizando…" : "Actualizar estado"}
            </button>
          )}
        </div>
      </header>

      {session.status === "ESCALATED" && <ReviewPanel onResolve={onResolve} />}

      <div className="result__grid">
        <section className="block block--timeline" aria-labelledby="steps-title">
          <h3 id="steps-title" className="block__title">
            Ejecución de sub-agentes
          </h3>
          <Timeline steps={session.steps} />
        </section>

        <div className="result__side">
          {session.customer_message && (
            <section className="block" aria-labelledby="msg-title">
              <h3 id="msg-title" className="block__title">
                Mensaje al cliente
              </h3>
              <blockquote className="customer-msg">{session.customer_message}</blockquote>
            </section>
          )}

          <section className="block" aria-labelledby="esc-title">
            <h3 id="esc-title" className="block__title">
              Escalamientos <span className="count">{session.escalations.length}</span>
            </h3>
            {session.escalations.length === 0 ? (
              <p className="muted small">Sin escalamientos. El flujo se resolvió automáticamente.</p>
            ) : (
              <ul className="esc-list">
                {session.escalations.map((e, i) => (
                  <li key={i} className="esc">
                    <div className="esc__top">
                      <span className={`pill pill--${tone(e.severity)}`}>
                        Severidad {SEVERITY_LABELS[e.severity]?.toLowerCase() ?? e.severity}
                      </span>
                      <span className="xsmall muted">{agentLabel(e.source_agent)}</span>
                    </div>
                    <p className="esc__reason">{e.reason}</p>
                    <p className="esc__solution">
                      <strong>Solución propuesta:</strong> {e.proposed_solution}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="block" aria-labelledby="docs-title">
            <h3 id="docs-title" className="block__title">
              Documentos requeridos <span className="count">{session.required_documents.length}</span>
            </h3>
            {session.required_documents.length === 0 ? (
              <p className="muted small">No se requieren documentos adicionales.</p>
            ) : (
              <ul className="doc-list">
                {session.required_documents.map((d) => (
                  <li key={d.code} className="doc">
                    <span className="doc__name">{d.name}</span>
                    <span className="mono xsmall muted">{d.code}</span>
                    <span className={d.mandatory ? "doc__req" : "doc__opt"}>
                      {d.mandatory ? "Obligatorio" : "Opcional"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section className="block" aria-labelledby="conv-title">
        <details className="conv" open={session.conversation.length <= 8}>
          <summary>
            <h3 id="conv-title" className="block__title block__title--inline">
              Registro de conversación <span className="count">{session.conversation.length}</span>
            </h3>
          </summary>
          {session.conversation.length === 0 ? (
            <p className="muted small">Sin mensajes registrados.</p>
          ) : (
            <ol className="conv-list">
              {session.conversation.map((m, i) => (
                <li key={i} className={`msg msg--${m.role}`}>
                  <div className="msg__meta">
                    <span className="msg__role">{ROLE_LABELS[m.role] ?? m.role}</span>
                    {m.agent && <span className="msg__agent">{agentLabel(m.agent)}</span>}
                    {m.ts && (
                      <time className="msg__ts mono" dateTime={m.ts}>
                        {formatTime(m.ts)}
                      </time>
                    )}
                  </div>
                  <p className="msg__content">{m.content}</p>
                </li>
              ))}
            </ol>
          )}
        </details>
      </section>

      {(session.created_at || session.updated_at) && (
        <p className="xsmall muted result__stamp">
          {session.created_at && <>Creada {formatDateTime(session.created_at)}</>}
          {session.updated_at && session.updated_at !== session.created_at && (
            <> · Actualizada {formatDateTime(session.updated_at)}</>
          )}
        </p>
      )}
    </article>
  );
}
