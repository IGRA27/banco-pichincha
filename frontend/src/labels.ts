export const PRODUCTS = [
  { value: "cuenta_ahorros", label: "Cuenta de ahorros" },
  { value: "cuenta_corriente", label: "Cuenta corriente" },
  { value: "tarjeta_credito", label: "Tarjeta de crédito" },
] as const;

export const productLabel = (v: string) => PRODUCTS.find((p) => p.value === v)?.label ?? v;

export const AGENT_LABELS: Record<string, string> = {
  orchestrator: "Orquestador",
  identity_agent: "Agente de identidad",
  risk_agent: "Agente de riesgo",
  documentation_agent: "Agente de documentación",
  response_agent: "Agente de respuesta",
  human_reviewer: "Revisor humano",
};
export const agentLabel = (a?: string | null) => (a ? AGENT_LABELS[a] ?? a : "");

export const STEP_LABELS: Record<string, string> = {
  IDENTITY_VERIFICATION: "Verificación de identidad",
  RISK_SCREENING: "Consulta de listas de riesgo",
  POLICY_DECISION: "Decisión por políticas del banco",
  DOCUMENTATION: "Preparación de documentación",
  CUSTOMER_RESPONSE: "Respuesta al cliente",
  HUMAN_REVIEW: "Revisión humana",
};
export const stepLabel = (s: string) =>
  STEP_LABELS[s] ?? s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export const STATUS_LABELS: Record<string, string> = {
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  ESCALATED: "Escalado a revisión",
  IN_PROGRESS: "En curso",
};

export const DECISION_LABELS: Record<string, string> = {
  APTO: "Apto",
  NO_APTO: "No apto",
  REVISION_MANUAL: "Revisión manual",
};

export const STEP_STATUS_LABELS: Record<string, string> = {
  OK: "Completado",
  ESCALATED: "Escalado",
  FAILED: "Fallido",
  SKIPPED: "Omitido",
};

export const SEVERITY_LABELS: Record<string, string> = { low: "Baja", medium: "Media", high: "Alta" };

export const ROLE_LABELS: Record<string, string> = { user: "Usuario", assistant: "Asistente", system: "Sistema" };

export function tone(value: string | null | undefined): "ok" | "bad" | "warn" | "muted" {
  switch (value) {
    case "APTO":
    case "APPROVED":
    case "OK":
    case "low":
      return "ok";
    case "NO_APTO":
    case "REJECTED":
    case "FAILED":
    case "high":
      return "bad";
    case "REVISION_MANUAL":
    case "ESCALATED":
    case "medium":
    case "IN_PROGRESS":
      return "warn";
    default:
      return "muted";
  }
}

export function formatTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "medium" });
}
