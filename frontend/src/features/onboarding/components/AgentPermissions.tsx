import { Skeleton } from "@/components/ui/skeleton";
import type { AgentMatrix } from "../types";
import { agentIcon, agentLabel } from "../labels";
import { ErrorNotice } from "./ErrorNotice";

interface Props {
  matrix: AgentMatrix | null;
  error: unknown;
  onRetry: () => void;
}

export function AgentPermissions({ matrix, error, onRetry }: Props) {
  if (error) return <ErrorNotice error={error} title="No se cargaron los permisos" onRetry={onRetry} />;
  if (!matrix) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Cargando permisos">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  const agents = Object.keys(matrix);
  if (agents.length === 0) return <p className="text-sm text-muted-foreground">No hay agentes registrados.</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Cada agente solo puede usar las herramientas que tiene autorizadas.</p>
      <ul className="divide-y rounded-lg border">
        {agents.map((a) => {
          const Icon = agentIcon(a);
          return (
            <li key={a} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <span className="grid size-8 place-items-center rounded-full bg-secondary text-primary" aria-hidden="true">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium">{agentLabel(a)}</span>
              <span className="flex flex-wrap gap-1.5">
                {matrix[a].length === 0 ? (
                  <span className="text-xs text-muted-foreground">Sin herramientas</span>
                ) : (
                  matrix[a].map((t) => (
                    <code key={t} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {t}
                    </code>
                  ))
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
