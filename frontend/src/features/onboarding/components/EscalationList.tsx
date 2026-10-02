import { Lightbulb } from "lucide-react";
import type { Escalation } from "../types";
import { agentLabel } from "../labels";

export function EscalationList({ escalations }: { escalations: Escalation[] }) {
  if (escalations.length === 0) return null;
  return (
    <section aria-labelledby="esc-title" className="space-y-2">
      <h3 id="esc-title" className="text-sm font-medium">
        {escalations.length === 1 ? "Qué hay que resolver" : `Qué hay que resolver (${escalations.length})`}
      </h3>
      <ul className="space-y-2">
        {escalations.map((e, i) => (
          <li key={i} className="rounded-lg border border-warning/25 bg-warning-soft/60 p-3">
            <p className="text-sm font-medium">{e.reason}</p>
            <p className="mt-1.5 flex gap-2 text-sm text-foreground/85">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <span>
                <span className="sr-only">Solución propuesta: </span>
                {e.proposed_solution}
              </span>
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">Detectado por {agentLabel(e.source_agent).toLowerCase()}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
