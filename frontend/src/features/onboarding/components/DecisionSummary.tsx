import { CheckCircle2, CircleDashed, Clock3, UserCheck, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Session } from "../types";
import { OUTCOME_COPY, productLabel, tone } from "../labels";

const ICON: Record<string, LucideIcon> = {
  ok: CheckCircle2,
  bad: XCircle,
  warn: Clock3,
  muted: CircleDashed,
};

const SURFACE: Record<string, string> = {
  ok: "bg-success-soft text-success",
  bad: "bg-destructive-soft text-destructive",
  warn: "bg-warning-soft text-warning",
  muted: "bg-muted text-muted-foreground",
};

function policyReason(session: Session): string | null {
  const step = session.steps.find((s) => s.step === "POLICY_DECISION");
  const out = step?.output as { reasons?: unknown } | undefined;
  const reasons = Array.isArray(out?.reasons) ? (out!.reasons as string[]) : [];
  return reasons.length ? reasons.join(" · ") : step?.notes ?? null;
}

export function DecisionSummary({ session }: { session: Session }) {
  const t = tone(session.status);
  const Icon = ICON[t];
  const copy = OUTCOME_COPY[session.status] ?? { title: session.status, hint: "" };
  const review = session.steps.find((s) => s.step === "HUMAN_REVIEW");
  const reason = policyReason(session);

  return (
    <div className="flex items-start gap-4">
      <span className={cn("grid size-12 shrink-0 place-items-center rounded-full", SURFACE[t])} aria-hidden="true">
        <Icon className="size-6" />
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-muted-foreground">
          {session.prospect.prospect_name} · {productLabel(session.prospect.product)}
        </p>
        <h2 id="result-title" className="text-2xl font-semibold tracking-tight">
          {copy.title}
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">{reason && t === "bad" ? reason : copy.hint}</p>
        {review && (
          <p className="flex items-center gap-1.5 pt-1 text-sm">
            <UserCheck className="size-4 text-primary" aria-hidden="true" />
            {review.notes || "Resuelto por revisión humana."}
          </p>
        )}
      </div>
    </div>
  );
}
