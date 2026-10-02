import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import type { AgentMatrix as Matrix, Prospect, ResolveBody, Scenario, Session } from "./types";
import { OnboardingForm } from "./components/OnboardingForm";
import { AgentMatrix } from "./components/AgentMatrix";
import { SessionResult } from "./components/SessionResult";
import { ErrorNotice } from "./components/ErrorNotice";

const PIPELINE = ["Identidad", "Listas de riesgo", "Documentación", "Respuesta"];

function readSessionFromHash(): string | null {
  const m = window.location.hash.match(/session=([\w-]+)/);
  return m ? m[1] : null;
}

export default function App() {
  const [scenarios, setScenarios] = useState<Scenario[] | null>(null);
  const [scenariosError, setScenariosError] = useState<unknown>(null);
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [matrixError, setMatrixError] = useState<unknown>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [lastProspect, setLastProspect] = useState<Prospect | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const loadScenarios = useCallback(() => {
    setScenariosError(null);
    setScenarios(null);
    api.scenarios().then(setScenarios).catch(setScenariosError);
  }, []);

  const loadMatrix = useCallback(() => {
    setMatrixError(null);
    setMatrix(null);
    api.agents().then(setMatrix).catch(setMatrixError);
  }, []);

  useEffect(() => {
    loadScenarios();
    loadMatrix();
    const id = readSessionFromHash();
    if (id) {
      setRefreshing(true);
      api
        .get(id)
        .then(setSession)
        .catch(setError)
        .finally(() => setRefreshing(false));
    }
  }, [loadScenarios, loadMatrix]);

  useEffect(() => {
    if (session) history.replaceState(null, "", `#session=${session.session_id}`);
  }, [session]);

  const focusResult = () => requestAnimationFrame(() => resultRef.current?.focus());

  const start = async (p: Prospect) => {
    setSubmitting(true);
    setError(null);
    setLastProspect(p);
    try {
      const s = await api.start(p);
      setSession(s);
    } catch (e) {
      setError(e);
    } finally {
      setSubmitting(false);
      focusResult();
    }
  };

  const refresh = async () => {
    if (!session) return;
    setRefreshing(true);
    try {
      setSession(await api.get(session.session_id));
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setRefreshing(false);
    }
  };

  const resolve = async (body: ResolveBody) => {
    if (!session) return;
    const s = await api.resolve(session.session_id, body);
    setSession(s);
    focusResult();
  };

  const reset = () => {
    setSession(null);
    setError(null);
    history.replaceState(null, "", window.location.pathname);
  };

  return (
    <div className="app">
      <a href="#resultado" className="skip">
        Saltar al resultado
      </a>
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true" />
            <div>
              <h1 className="brand__title">Onboarding Agéntico · Demo</h1>
              <p className="brand__sub">Orquestador multi-agente de vinculación de clientes</p>
            </div>
          </div>
          <ol className="pipeline" aria-label="Secuencia de sub-agentes">
            {PIPELINE.map((p, i) => (
              <li key={p}>
                <span className="pipeline__n">{i + 1}</span>
                {p}
              </li>
            ))}
          </ol>
        </div>
      </header>

      <main className="layout">
        <aside className="layout__aside">
          <OnboardingForm
            scenarios={scenarios}
            scenariosError={scenariosError}
            onReloadScenarios={loadScenarios}
            submitting={submitting}
            onSubmit={start}
          />
          <AgentMatrix matrix={matrix} error={matrixError} onRetry={loadMatrix} />
        </aside>

        <div id="resultado" className="layout__main" ref={resultRef} tabIndex={-1} aria-live="polite" aria-busy={submitting || refreshing}>
          {error ? (
            <ErrorNotice
              error={error}
              title={session ? "No se pudo actualizar la sesión" : "No se pudo iniciar el onboarding"}
              onRetry={session ? refresh : lastProspect ? () => start(lastProspect) : undefined}
            />
          ) : null}

          {submitting ? (
            <div className="loading-state">
              <div className="loading-state__rail">
                {PIPELINE.map((p, i) => (
                  <div key={p} className="loading-state__step" style={{ animationDelay: `${i * 0.35}s` }}>
                    <span className="loading-state__dot" />
                    {p}
                  </div>
                ))}
              </div>
              <p>El orquestador está coordinando a los sub-agentes…</p>
            </div>
          ) : session ? (
            <>
              <div className="result__toolbar">
                <button type="button" className="btn btn--ghost btn--sm" onClick={reset}>
                  Nueva consulta
                </button>
              </div>
              <SessionResult session={session} refreshing={refreshing} onRefresh={refresh} onResolve={resolve} />
            </>
          ) : refreshing ? (
            <div className="loading-state">
              <span className="spinner spinner--dark" aria-hidden="true" />
              <p>Cargando sesión…</p>
            </div>
          ) : !error ? (
            <div className="empty">
              <div className="empty__diagram" aria-hidden="true">
                <span className="empty__node empty__node--root">Orquestador</span>
                <span className="empty__lines" />
                <div className="empty__children">
                  {PIPELINE.map((p) => (
                    <span key={p} className="empty__node">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <h2>Sin solicitudes en curso</h2>
              <p>
                Elige un escenario de demostración o ingresa los datos de un prospecto. Verás cómo el orquestador
                delega en cada sub-agente, sus reintentos y escalamientos, y la decisión final.
              </p>
            </div>
          ) : null}
        </div>
      </main>

      <footer className="footer">
        <p>Demostración técnica · Datos ficticios · No es un canal oficial de ninguna entidad financiera.</p>
      </footer>
    </div>
  );
}
