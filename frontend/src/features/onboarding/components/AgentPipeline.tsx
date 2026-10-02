import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE } from "../labels";

/** Live stepper shown while the orchestrator works. Advances optimistically; the real trace replaces it on completion. */
export function AgentPipeline() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((i) => Math.min(i + 1, PIPELINE.length - 1)), 420);
    return () => clearInterval(t);
  }, []);

  const current = PIPELINE[active];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-2 py-10 text-center">
      <ol className="flex w-full max-w-md items-start justify-between" aria-label="Avance de los agentes">
        {PIPELINE.map((p, i) => {
          const done = i < active;
          const now = i === active;
          const Icon = p.icon;
          return (
            <li key={p.step} className="relative flex flex-1 flex-col items-center gap-2">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-5 right-1/2 h-0.5 w-full -translate-y-1/2 transition-colors duration-500",
                    i <= active ? "bg-primary" : "bg-border",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 grid size-10 place-items-center rounded-full border-2 bg-card transition-all duration-300",
                  done && "border-primary bg-primary text-primary-foreground",
                  now && "pulse-ring border-primary text-primary",
                  !done && !now && "border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" /> : <Icon className="size-4" />}
              </span>
              <span className={cn("text-xs", now ? "font-medium text-foreground" : "text-muted-foreground")}>
                {p.label}
              </span>
              <span className="sr-only">{done ? "listo" : now ? "en curso" : "pendiente"}</span>
            </li>
          );
        })}
      </ol>
      <div className="space-y-1" aria-live="polite">
        <p className="font-medium">Revisando la solicitud…</p>
        <p className="text-sm text-muted-foreground">Ahora: {current.label.toLowerCase()}</p>
      </div>
    </div>
  );
}
