import { clearToken, getToken, notifyUnauthorized } from "@/features/auth/token";
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

const FIELD_LABELS: Record<string, string> = {
  prospect_name: "Nombre del prospecto",
  document_id: "Cédula",
  product: "Producto",
  reviewer: "Revisor",
  notes: "Notas",
  decision: "Decisión",
};

interface ValidationItem {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
  ctx?: { min_length?: number; max_length?: number };
}

/** Pydantic messages arrive in English; translate the common ones and strip the "Value error," prefix. */
function friendlyMsg(item: ValidationItem): string {
  const ctx = item.ctx ?? {};
  switch (item.type) {
    case "string_too_short":
      return `debe tener al menos ${ctx.min_length ?? "más"} caracteres`;
    case "string_too_long":
      return `admite como máximo ${ctx.max_length ?? "menos"} caracteres`;
    case "missing":
      return "es obligatorio";
    case "string_pattern_mismatch":
      return "tiene un formato no válido";
  }
  return (item.msg ?? "valor inválido").replace(/^Value error,\s*/i, "");
}

function describeValidation(item: ValidationItem): string {
  const loc = (item.loc ?? []).filter((p) => p !== "body");
  const field = loc.length ? String(loc[loc.length - 1]) : "";
  const label = FIELD_LABELS[field] ?? field;
  return label ? `${label}: ${friendlyMsg(item)}` : friendlyMsg(item);
}

interface RequestOptions extends RequestInit {
  /** Login must not send a token nor treat 401 as an expired session. */
  anonymous?: boolean;
}

export async function request<T>(path: string, init?: RequestOptions): Promise<T> {
  const { anonymous, ...rest } = init ?? {};
  const token = anonymous ? null : getToken();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(rest.headers ?? {}),
      },
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
    if (res.status === 401 && !anonymous) {
      clearToken();
      notifyUnauthorized();
      throw new ApiError(401, "Tu sesión expiró. Vuelve a ingresar.");
    }
    if (res.status === 422 && Array.isArray(detail)) {
      throw new ApiError(422, "Revisa los datos ingresados.", (detail as ValidationItem[]).map(describeValidation));
    }
    if (res.status === 429 && typeof detail === "string") throw new ApiError(429, detail);
    if (res.status === 429)
      throw new ApiError(429, "Hay demasiadas solicitudes seguidas. Espera unos segundos y vuelve a intentarlo.");
    if (typeof detail === "string") throw new ApiError(res.status, detail);
    if (res.status === 404) throw new ApiError(404, "Recurso no encontrado.");
    if (res.status >= 500) throw new ApiError(res.status, "El servicio tuvo un error interno. Intenta nuevamente en unos segundos.");
    throw new ApiError(res.status, `La solicitud falló (HTTP ${res.status}).`);
  }
  return body as T;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  username: string;
}

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
      anonymous: true,
    }),
  me: () => request<{ username: string }>("/api/v1/auth/me"),
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
