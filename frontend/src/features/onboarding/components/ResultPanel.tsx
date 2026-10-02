import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AgentMatrix, ResolveBody, Session } from "../types";
import type { Phase } from "../hooks/useOnboarding";
import { OUTCOME_COPY, PIPELINE } from "../labels";
import { AgentPermissions } from "./AgentPermissions";
import { AgentPipeline } from "./AgentPipeline";
import { ConversationLog } from "./ConversationLog";
import { CustomerMessage } from "./CustomerMessage";
import { DecisionSummary } from "./DecisionSummary";
import { ErrorNotice } from "./ErrorNotice";
import { EscalationList } from "./EscalationList";
import { RequiredDocuments } from "./RequiredDocuments";
import { ReviewPanel } from "./ReviewPanel";
import { StepTimeline } from "./StepTimeline";

interface Props {
  phase: Phase;
  session: Session | null;
  error: unknown;
  canRetry: boolean;
  onRetry: () => void;
  onReset: () => void;
  onResolve: (body: ResolveBody) => Promise<void>;
  matrix: AgentMatrix | null;
  matrixError: unknown;
  onReloadMatrix: () => void;
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 py-12 text-center">
      <div className="flex items-center gap-1.5 text-muted-foreground/70" aria-hidden="true">
        {PIPELINE.map((p, i) => (
          <span key={p.step} className="flex items-center gap-1.5">
            {i > 0 && <span className="h-px w-4 bg-border" />}
            <span className="grid size-8 place-items-center rounded-full border bg-card">
              <p.icon className="size-3.5" />
            </span>
          </span>
        ))}
      </div>
      <p className="max-w-xs text-sm text-pretty text-muted-foreground">
        Elige un caso de ejemplo y pulsa <span className="font-medium text-foreground">Evaluar solicitud</span> para ver
        cómo trabajan los agentes.
      </p>
    </div>
  );
}

function Pane({ children }: { children: React.ReactNode }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-5 sm:p-6">{children}</div>
    </ScrollArea>
  );
}

export function ResultPanel(props: Props) {
  const { phase, session, error, canRetry, onRetry, onReset, onResolve } = props;
  const [tab, setTab] = useState("resumen");
  const headingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === "submitting") setTab("resumen");
    if (phase === "done") requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  }, [phase, session?.session_id]);

  const hasSession = phase === "done" && !!session;
  const isEscalated = session?.status === "ESCALATED";

  let summary: React.ReactNode;
  if (phase === "submitting") summary = <AgentPipeline />;
  else if (phase === "loading")
    summary = (
      <div className="flex h-full items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando la solicitud…
      </div>
    );
  else if (phase === "error")
    summary = (
      <Pane>
        <ErrorNotice error={error} title="No se pudo evaluar la solicitud" onRetry={canRetry ? onRetry : undefined} />
      </Pane>
    );
  else if (hasSession)
    summary = (
      <Pane>
        <div ref={headingRef} tabIndex={-1} className="space-y-6 rounded-md outline-none">
          <DecisionSummary session={session} />
          {isEscalated && <EscalationList escalations={session.escalations} />}
          {isEscalated && (
            <ReviewPanel
              prospectName={session.prospect.prospect_name}
              escalations={session.escalations}
              onResolve={onResolve}
            />
          )}
          <CustomerMessage message={session.customer_message} />
          <RequiredDocuments documents={session.required_documents} />
        </div>
      </Pane>
    );
  else summary = <EmptyState />;

  return (
    <section
      aria-labelledby="result-label"
      aria-busy={phase === "submitting" || phase === "loading"}
      className="flex h-[min(680px,85dvh)] flex-col overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(15_38_92/0.04),0_8px_24px_-12px_rgb(15_38_92/0.12)] lg:h-full lg:min-h-0"
    >
      <h2 id="result-label" className="sr-only">
        Resultado
      </h2>
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="flex items-center justify-between gap-2 px-3 pt-3 sm:px-4">
          <TabsList className="max-w-full overflow-x-auto">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="traza" disabled={!hasSession}>
              Traza
            </TabsTrigger>
            <TabsTrigger value="conversacion" disabled={!hasSession}>
              Conversación
            </TabsTrigger>
            <TabsTrigger value="permisos">Permisos</TabsTrigger>
          </TabsList>
          {hasSession && (
            <Button variant="ghost" size="sm" onClick={onReset} className="shrink-0">
              <RotateCcw aria-hidden="true" />
              <span className="hidden sm:inline">Nueva consulta</span>
              <span className="sr-only sm:hidden">Nueva consulta</span>
            </Button>
          )}
        </div>
        <Separator className="mt-3" />
        <div className="relative min-h-0 flex-1">
          <TabsContent value="resumen" className="absolute inset-0">
            {summary}
          </TabsContent>
          <TabsContent value="traza" className="absolute inset-0">
            {session && (
              <Pane>
                <StepTimeline steps={session.steps} />
              </Pane>
            )}
          </TabsContent>
          <TabsContent value="conversacion" className="absolute inset-0">
            {session && (
              <Pane>
                <ConversationLog turns={session.conversation} />
              </Pane>
            )}
          </TabsContent>
          <TabsContent value="permisos" className="absolute inset-0">
            <Pane>
              <AgentPermissions matrix={props.matrix} error={props.matrixError} onRetry={props.onReloadMatrix} />
            </Pane>
          </TabsContent>
        </div>
      </Tabs>
      <p className="sr-only" aria-live="polite">
        {hasSession ? `Resultado: ${OUTCOME_COPY[session.status]?.title ?? session.status}` : ""}
      </p>
      {hasSession && (
        <p className="flex items-center gap-1.5 border-t px-4 py-2 text-xs text-muted-foreground">
          <Workflow className="size-3.5" aria-hidden="true" />
          Sesión <span className="font-mono">{session.session_id.slice(0, 8)}</span>
        </p>
      )}
    </section>
  );
}
