import { Circle, CircleDot } from "lucide-react";
import type { RequiredDocument } from "../types";

export function RequiredDocuments({ documents }: { documents: RequiredDocument[] }) {
  if (documents.length === 0) return null;
  return (
    <section aria-labelledby="docs-title" className="space-y-2">
      <h3 id="docs-title" className="text-sm font-medium">
        Documentos para continuar
      </h3>
      <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {documents.map((d) => {
          const Icon = d.mandatory ? CircleDot : Circle;
          return (
            <li key={d.code} className="flex items-center gap-2 text-sm">
              <Icon
                className={d.mandatory ? "size-4 shrink-0 text-primary" : "size-4 shrink-0 text-muted-foreground"}
                aria-hidden="true"
              />
              <span className="min-w-0">
                {d.name}
                {!d.mandatory && <span className="text-muted-foreground"> (opcional)</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
