import type { AgentMatrix, Prospect, ResolveBody, Scenario, Session } from "./types";

const BASE: string = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  details: string[];
  constructor(status: number, message: string, details: string[] = []) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface ValidationItem {
  loc?: (string | number)[];
  msg?: string;
}

const FIELD_LABELS: Record<string, string> = {
  prospect_name: "Nombre del prospecto",
  document_id: "Cédula",
  product: "Producto",
  reviewer: "Revisor",
  notes: "Notas",
  decision: "Decisión",
};

function describeValidation(item: ValidationItem): string {
  const loc = (item.loc ?? []).filter((p) => p !== "body");
  const field = loc.length ? String(loc[loc.length - 1]) : "";
  const label = FIELD_LABELS[field] ?? field;
  return label ? `${label}: ${item.msg ?? "valor inválido"}` : item.msg ?? "Valor inválido";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", Accept: "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servicio. Verifica tu conexión o que la API esté disponible.");
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const detail = (body as { detail?: unknown } | null)?.detail;
    if (res.status === 422 && Array.isArray(detail)) {
      throw new ApiError(422, "Revisa los datos ingresados.", (detail as ValidationItem[]).map(describeValidation));
    }
    if (typeof detail === "string") throw new ApiError(res.status, detail);
    if (res.status === 404) throw new ApiError(404, "Recurso no encontrado.");
    if (res.status >= 500) throw new ApiError(res.status, "El servicio tuvo un error interno. Intenta nuevamente en unos segundos.");
    throw new ApiError(res.status, `La solicitud falló (HTTP ${res.status}).`);
  }
  return body as T;
}

export const api = {
  scenarios: () => request<Scenario[]>("/api/v1/onboarding/scenarios"),
  agents: () => request<AgentMatrix>("/api/v1/agents"),
  start: (prospect: Prospect) =>
    request<Session>("/api/v1/onboarding/start", { method: "POST", body: JSON.stringify(prospect) }),
  get: (id: string) => request<Session>(`/api/v1/onboarding/${encodeURIComponent(id)}`),
  resolve: (id: string, body: ResolveBody) =>
    request<Session>(`/api/v1/onboarding/${encodeURIComponent(id)}/resolve`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
