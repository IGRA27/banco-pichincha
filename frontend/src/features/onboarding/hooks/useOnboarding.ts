import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { AgentMatrix, Prospect, ResolveBody, Scenario, Session } from "../types";

export type Phase = "idle" | "loading" | "submitting" | "done" | "error";

function readSessionFromHash(): string | null {
  const m = window.location.hash.match(/session=([\w-]+)/);
  return m ? m[1] : null;
}

/** Minimum time the live pipeline stays on screen so the agent hand-offs are readable. */
const MIN_PIPELINE_MS = 2200;

export function useOnboarding() {
  const [phase, setPhase] = useState<Phase>(() => (readSessionFromHash() ? "loading" : "idle"));
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [lastProspect, setLastProspect] = useState<Prospect | null>(null);

  const [scenarios, setScenarios] = useState<Scenario[] | null>(null);
  const [scenariosError, setScenariosError] = useState<unknown>(null);
  const [matrix, setMatrix] = useState<AgentMatrix | null>(null);
  const [matrixError, setMatrixError] = useState<unknown>(null);
  const reqId = useRef(0);

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
      api
        .get(id)
        .then((s) => {
          setSession(s);
          setPhase("done");
        })
        .catch((e) => {
          setError(e);
          setPhase("error");
          history.replaceState(null, "", window.location.pathname);
        });
    }
  }, [loadScenarios, loadMatrix]);

  useEffect(() => {
    if (session) history.replaceState(null, "", `#session=${session.session_id}`);
  }, [session]);

  const start = useCallback(async (p: Prospect) => {
    const id = ++reqId.current;
    setPhase("submitting");
    setError(null);
    setLastProspect(p);
    const started = performance.now();
    try {
      const s = await api.start(p);
      const wait = MIN_PIPELINE_MS - (performance.now() - started);
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (wait > 0 && !reduce) await new Promise((r) => setTimeout(r, wait));
      if (id !== reqId.current) return;
      setSession(s);
      setPhase("done");
    } catch (e) {
      if (id !== reqId.current) return;
      setError(e);
      setPhase("error");
    }
  }, []);

  const retry = useCallback(() => {
    if (lastProspect) void start(lastProspect);
  }, [lastProspect, start]);

  /** Throws on failure so the caller can surface it inline / via toast. */
  const resolve = useCallback(
    async (body: ResolveBody) => {
      if (!session) return;
      const s = await api.resolve(session.session_id, body);
      setSession(s);
    },
    [session],
  );

  const reset = useCallback(() => {
    reqId.current++;
    setSession(null);
    setError(null);
    setPhase("idle");
    history.replaceState(null, "", window.location.pathname);
  }, []);

  return {
    phase,
    session,
    error,
    lastProspect,
    start,
    retry,
    resolve,
    reset,
    scenarios,
    scenariosError,
    loadScenarios,
    matrix,
    matrixError,
    loadMatrix,
  };
}
