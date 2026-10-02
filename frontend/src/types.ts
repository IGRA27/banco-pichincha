export type Product = "cuenta_ahorros" | "cuenta_corriente" | "tarjeta_credito";
export type SessionStatus = "APPROVED" | "REJECTED" | "ESCALATED" | "IN_PROGRESS";
export type Decision = "APTO" | "NO_APTO" | "REVISION_MANUAL";
export type StepStatus = "OK" | "ESCALATED" | "FAILED" | "SKIPPED";
export type Severity = "low" | "medium" | "high";

export interface Prospect {
  prospect_name: string;
  document_id: string;
  product: Product | string;
}

export interface Step {
  agent: string;
  step: string;
  status: StepStatus | string;
  tool: string | null;
  output: unknown;
  attempts: number;
  duration_ms: number;
  notes?: string | null;
}

export interface Escalation {
  reason: string;
  source_agent: string;
  proposed_solution: string;
  severity: Severity | string;
}

export interface RequiredDocument {
  code: string;
  name: string;
  mandatory: boolean;
}

export interface ConversationTurn {
  role: "user" | "assistant" | "system" | string;
  agent?: string | null;
  content: string;
  ts?: string | null;
}

export interface Session {
  session_id: string;
  status: SessionStatus | string;
  decision: Decision | string | null;
  prospect: Prospect;
  steps: Step[];
  escalations: Escalation[];
  required_documents: RequiredDocument[];
  customer_message: string | null;
  conversation: ConversationTurn[];
  created_at?: string;
  updated_at?: string;
}

export interface Scenario {
  document_id: string;
  prospect_name: string;
  label: string;
  expected: string;
}

export type AgentMatrix = Record<string, string[]>;

export interface ResolveBody {
  decision: "approve" | "reject";
  reviewer: string;
  notes: string;
}
