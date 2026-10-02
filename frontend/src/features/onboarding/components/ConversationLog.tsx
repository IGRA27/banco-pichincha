import { cn } from "@/lib/utils";
import type { ConversationTurn } from "../types";
import { ROLE_LABELS, agentLabel, formatTime } from "../labels";

export function ConversationLog({ turns }: { turns: ConversationTurn[] }) {
  if (turns.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sin mensajes registrados.</p>;
  }
  return (
    <ol className="space-y-3">
      {turns.map((m, i) => {
        const isSystem = m.role === "system";
        const isAssistant = m.role === "assistant";
        return (
          <li key={i} className={cn("flex flex-col gap-1", isAssistant && "items-end")}>
            <p className="flex gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">
                {m.agent ? agentLabel(m.agent) : ROLE_LABELS[m.role] ?? m.role}
              </span>
              {m.ts && <time dateTime={m.ts} className="tabular-nums">{formatTime(m.ts)}</time>}
            </p>
            <p
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                isSystem && "rounded-tl-sm bg-muted font-mono text-xs text-muted-foreground",
                isAssistant && "rounded-tr-sm bg-primary text-primary-foreground",
                !isSystem && !isAssistant && "rounded-tl-sm bg-secondary",
              )}
            >
              {m.content}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
