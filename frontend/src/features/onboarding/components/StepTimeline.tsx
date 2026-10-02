import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Step } from "../types";
import { STEP_STATUS_LABELS, agentIcon, agentLabel, stepLabel } from "../labels";
import { toneBadge } from "./tone";

function hasOutput(o: unknown): boolean {
  if (o === null || o === undefined) return false;
  if (typeof o === "object") return Object.keys(o as object).length > 0;
  return true;
}

function GuardrailBadge({ step }: { step: Step }) {
  if (step.step !== "CUSTOMER_RESPONSE") return null;
  const g = (step.output as { guardrail?: string } | null)?.guardrail;
  if (!g) return null;
  const ok = g === "passed";
  return (
    <Badge variant="outline" className={cn("shrink-0", ok ? "text-success" : "text-destructive")}>
      {ok ? "Guardrail OK" : "Guardrail bloqueado"}
    </Badge>
  );
}

export function StepTimeline({ steps }: { steps: Step[] }) {
  if (steps.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay pasos registrados.</p>;
  }
  const total = steps.reduce((acc, s) => acc + (s.duration_ms || 0), 0);
  const retries = steps.filter((s) => s.attempts > 1).length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {steps.length} pasos · {total} ms
        {retries > 0 && ` · ${retries} con reintentos`}. Abre un paso para ver el detalle técnico.
      </p>
      <Accordion type="multiple" className="relative">
        {steps.map((s, i) => {
          const Icon = agentIcon(s.agent);
          return (
            <AccordionItem key={`${s.step}-${i}`} value={`${s.step}-${i}`} className="border-b last:border-b">
              <AccordionTrigger className="items-center gap-3 py-3 hover:no-underline">
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-primary"
                    aria-hidden="true"
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block truncate font-medium">{stepLabel(s.step)}</span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {agentLabel(s.agent)}
                      {s.notes ? ` · ${s.notes}` : ""}
                    </span>
                  </span>
                </span>
                <GuardrailBadge step={s} />
                <Badge className={cn("shrink-0", toneBadge(s.status))}>{STEP_STATUS_LABELS[s.status] ?? s.status}</Badge>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pl-11">
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Herramienta</dt>
                    <dd className="font-mono">{s.tool ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Intentos</dt>
                    <dd className={cn("tabular-nums", s.attempts > 1 && "font-semibold text-warning")}>{s.attempts}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Duración</dt>
                    <dd className="tabular-nums">{s.duration_ms} ms</dd>
                  </div>
                </dl>
                {hasOutput(s.output) && (
                  <pre
                    tabIndex={0}
                    aria-label={`Salida de ${stepLabel(s.step)}`}
                    className="max-h-48 overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed"
                  >
                    {JSON.stringify(s.output, null, 2)}
                  </pre>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
