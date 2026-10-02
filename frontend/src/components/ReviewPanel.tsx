import { useState } from "react";
import type { ResolveBody } from "../types";
import { ErrorNotice } from "./ErrorNotice";

interface Props {
  onResolve: (body: ResolveBody) => Promise<void>;
}

export function ReviewPanel({ onResolve }: Props) {
  const [reviewer, setReviewer] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState<ResolveBody["decision"] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [touched, setTouched] = useState(false);

  const reviewerError = touched && reviewer.trim().length < 2 ? "Indica el nombre del revisor." : null;

  const submit = async (decision: ResolveBody["decision"]) => {
    setTouched(true);
    if (reviewer.trim().length < 2) {
      document.getElementById("r-reviewer")?.focus();
      return;
    }
    setPending(decision);
    setError(null);
    try {
      await onResolve({ decision, reviewer: reviewer.trim(), notes: notes.trim() });
    } catch (e) {
      setError(e);
    } finally {
      setPending(null);
    }
  };

  return (
    <section className="review" aria-labelledby="review-title">
      <div className="review__head">
        <h3 id="review-title">Revisión humana requerida</h3>
        <p>El orquestador escaló el caso. Un analista debe aprobar o rechazar la solicitud.</p>
      </div>
      <div className="review__grid">
        <div className="field">
          <label htmlFor="r-reviewer">Revisor</label>
          <input
            id="r-reviewer"
            value={reviewer}
            autoComplete="name"
            onChange={(e) => setReviewer(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={!!reviewerError}
            aria-describedby={reviewerError ? "r-reviewer-err" : undefined}
            placeholder="Nombre del analista"
          />
          {reviewerError && (
            <p id="r-reviewer-err" className="field__error">
              {reviewerError}
            </p>
          )}
        </div>
        <div className="field field--wide">
          <label htmlFor="r-notes">Notas de la revisión</label>
          <textarea
            id="r-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Justificación de la decisión (opcional)"
          />
        </div>
      </div>
      {error ? <ErrorNotice error={error} title="No se registró la decisión" /> : null}
      <div className="review__actions">
        <button type="button" className="btn btn--danger" disabled={pending !== null} onClick={() => submit("reject")}>
          {pending === "reject" ? <span className="spinner" aria-hidden="true" /> : null}
          Rechazar
        </button>
        <button type="button" className="btn btn--approve" disabled={pending !== null} onClick={() => submit("approve")}>
          {pending === "approve" ? <span className="spinner" aria-hidden="true" /> : null}
          Aprobar
        </button>
      </div>
    </section>
  );
}
