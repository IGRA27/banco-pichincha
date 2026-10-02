import { Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Scenario } from "../types";
import { DECISION_LABELS, tone } from "../labels";
import { ErrorNotice } from "./ErrorNotice";

const DOT: Record<string, string> = {
  ok: "bg-success",
  bad: "bg-destructive",
  warn: "bg-warning",
  muted: "bg-muted-foreground",
};

interface Props {
  scenarios: Scenario[] | null;
  error: unknown;
  onRetry: () => void;
  value: string | null;
  onPick: (s: Scenario) => void;
}

export function ScenarioPicker({ scenarios, error, onRetry, value, onPick }: Props) {
  if (error) return <ErrorNotice error={error} title="No se cargaron los escenarios" onRetry={onRetry} />;
  if (scenarios === null) return <Skeleton className="h-9 w-full" aria-label="Cargando escenarios" />;
  if (scenarios.length === 0) return null;

  return (
    <Select
      value={value ?? ""}
      onValueChange={(id) => {
        const s = scenarios.find((x) => x.document_id === id);
        if (s) onPick(s);
      }}
    >
      <SelectTrigger
        aria-label="Probar un escenario de ejemplo"
        className="w-full border-dashed border-primary/30 bg-accent/15 hover:bg-accent/30 data-[placeholder]:text-foreground"
      >
        <Sparkles className="text-primary" aria-hidden="true" />
        <SelectValue placeholder="Probar un escenario de ejemplo" />
      </SelectTrigger>
      <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
        {scenarios.map((s) => (
          <SelectItem key={s.document_id} value={s.document_id} className="py-2">
            <span className={cn("size-2 shrink-0 rounded-full", DOT[tone(s.expected)])} aria-hidden="true" />
            <span className="flex min-w-0 flex-col text-left">
              <span className="truncate">{s.label}</span>
              <span className="text-xs text-muted-foreground">
                {s.prospect_name} · resultado esperado: {DECISION_LABELS[s.expected]?.toLowerCase() ?? s.expected}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
