import { useState, type FormEvent } from "react";
import type { Prospect, Scenario } from "../types";
import { PRODUCTS } from "../labels";
import { ErrorNotice } from "./ErrorNotice";

interface Props {
  scenarios: Scenario[] | null;
  scenariosError: unknown;
  onReloadScenarios: () => void;
  submitting: boolean;
  onSubmit: (p: Prospect) => void;
}

type Errors = Partial<Record<keyof Prospect, string>>;

function validate(p: Prospect): Errors {
  const e: Errors = {};
  if (p.prospect_name.trim().length < 3) e.prospect_name = "Ingresa el nombre completo (mínimo 3 caracteres).";
  if (!/^\d{10}$/.test(p.document_id.trim())) e.document_id = "La cédula debe tener exactamente 10 dígitos.";
  if (!p.product) e.product = "Selecciona un producto.";
  return e;
}

export function OnboardingForm({ scenarios, scenariosError, onReloadScenarios, submitting, onSubmit }: Props) {
  const [form, setForm] = useState<Prospect>({ prospect_name: "", document_id: "", product: "cuenta_ahorros" });
  const [errors, setErrors] = useState<Errors>({});
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const set = (k: keyof Prospect, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k !== "product") setActiveScenario(null);
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const applyScenario = (s: Scenario) => {
    setForm((f) => ({ ...f, prospect_name: s.prospect_name, document_id: s.document_id }));
    setErrors({});
    setActiveScenario(s.document_id);
  };

  const handleSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate(form);
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) {
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    onSubmit({ ...form, prospect_name: form.prospect_name.trim(), document_id: form.document_id.trim() });
  };

  return (
    <section className="panel" aria-labelledby="form-title">
      <header className="panel__head">
        <h2 id="form-title">Nueva solicitud</h2>
        <p className="panel__sub">Datos del prospecto para iniciar el flujo de vinculación.</p>
      </header>

      <div className="scenarios">
        <p className="label" id="scenarios-label">
          Escenarios de demostración
        </p>
        {scenariosError ? (
          <ErrorNotice error={scenariosError} title="No se cargaron los escenarios" onRetry={onReloadScenarios} />
        ) : scenarios === null ? (
          <div className="chips" aria-busy="true" aria-label="Cargando escenarios">
            {[0, 1, 2].map((i) => (
              <span key={i} className="chip chip--skeleton" />
            ))}
          </div>
        ) : scenarios.length === 0 ? (
          <p className="muted small">No hay escenarios configurados.</p>
        ) : (
          <div className="chips" role="group" aria-labelledby="scenarios-label">
            {scenarios.map((s) => (
              <button
                key={s.document_id}
                type="button"
                className="chip"
                aria-pressed={activeScenario === s.document_id}
                onClick={() => applyScenario(s)}
                title={`${s.prospect_name} · ${s.document_id}`}
              >
                <span className="chip__label">{s.label}</span>
                <span className="chip__expected">Esperado: {s.expected}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="f-prospect_name">Nombre del prospecto</label>
          <input
            id="f-prospect_name"
            autoComplete="name"
            value={form.prospect_name}
            onChange={(e) => set("prospect_name", e.target.value)}
            aria-invalid={!!errors.prospect_name}
            aria-describedby={errors.prospect_name ? "e-prospect_name" : undefined}
            placeholder="Juan Pérez"
          />
          {errors.prospect_name && (
            <p id="e-prospect_name" className="field__error">
              {errors.prospect_name}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="f-document_id">Cédula</label>
          <input
            id="f-document_id"
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            className="mono"
            value={form.document_id}
            onChange={(e) => set("document_id", e.target.value.replace(/\D/g, ""))}
            aria-invalid={!!errors.document_id}
            aria-describedby={errors.document_id ? "e-document_id" : "h-document_id"}
            placeholder="1712345678"
          />
          {errors.document_id ? (
            <p id="e-document_id" className="field__error">
              {errors.document_id}
            </p>
          ) : (
            <p id="h-document_id" className="field__hint">
              10 dígitos, sin guiones.
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="f-product">Producto</label>
          <select id="f-product" value={form.product} onChange={(e) => set("product", e.target.value)}>
            {PRODUCTS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting} aria-busy={submitting}>
          {submitting ? (
            <>
              <span className="spinner" aria-hidden="true" /> Orquestando agentes…
            </>
          ) : (
            "Iniciar onboarding"
          )}
        </button>
      </form>
    </section>
  );
}
