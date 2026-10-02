import { useState } from "react";
import { Bot, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "../api";
import type { Escalation, ResolveBody } from "../types";
import { ErrorNotice } from "./ErrorNotice";

interface Props {
  prospectName: string;
  escalations: Escalation[];
  onResolve: (body: ResolveBody) => Promise<void>;
}

const MIN_HIGH_NOTES = 10;

export function ReviewPanel({ prospectName, escalations, onResolve }: Props) {
  const isHigh = escalations.some((e) => e.severity === "high");
  const suggestions = escalations.map((e) => e.ai_recommendation).filter((r): r is NonNullable<typeof r> => !!r);
  const [reviewer, setReviewer] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState<ResolveBody["decision"] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [touched, setTouched] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  const ensureNotesForApprove = () => {
    if (isHigh && notes.trim().length < MIN_HIGH_NOTES) {
      setNotesError(`Para aprobar un caso de riesgo alto, explica tu decisión (mínimo ${MIN_HIGH_NOTES} caracteres).`);
      document.getElementById("r-notes")?.focus();
      return false;
    }
    setNotesError(null);
    return true;
  };

  const reviewerInvalid = reviewer.trim().length < 2;
  const reviewerError = touched && reviewerInvalid ? "Escribe tu nombre para firmar la decisión." : null;

  const ensureReviewer = () => {
    setTouched(true);
    if (reviewerInvalid) {
      document.getElementById("r-reviewer")?.focus();
      return false;
    }
    return true;
  };

  const submit = async (decision: ResolveBody["decision"]) => {
    setPending(decision);
    setError(null);
    try {
      await onResolve({ decision, reviewer: reviewer.trim(), notes: notes.trim() });
      toast.success(decision === "approve" ? "Solicitud aprobada" : "Solicitud rechazada", {
        description: `${prospectName} · firmado por ${reviewer.trim()}`,
      });
    } catch (e) {
      setError(e);
      toast.error("No se registró la decisión", {
        description: e instanceof ApiError || e instanceof Error ? e.message : undefined,
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <section aria-labelledby="review-title" className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div>
        <h3 id="review-title" className="text-sm font-semibold">
          Tu decisión
        </h3>
        <p className="text-sm text-muted-foreground">Revisa lo anterior y aprueba o rechaza la solicitud.</p>
      </div>
      {suggestions.length > 0 && (
        <div className="flex gap-2.5 rounded-lg bg-secondary/70 p-3 text-sm">
          <Bot className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 space-y-0.5">
            {suggestions.map((sg, i) => (
              <div key={i}>
                <p>
                  <span className="text-muted-foreground">Sugerencia del asistente:</span>{" "}
                  <span className="font-medium">{sg.label}</span>
                </p>
                {sg.rationale && <p className="text-xs text-muted-foreground">{sg.rationale}</p>}
              </div>
            ))}
            <p className="pt-1 text-xs font-medium text-foreground/80">La decisión final es tuya.</p>
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
        <div className="grid content-start gap-1.5">
          <Label htmlFor="r-reviewer">Revisor</Label>
          <Input
            id="r-reviewer"
            autoComplete="name"
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            onBlur={() => reviewer && setTouched(true)}
            aria-invalid={!!reviewerError}
            aria-describedby={reviewerError ? "r-reviewer-err" : undefined}
            placeholder="Tu nombre"
          />
          {reviewerError && (
            <p id="r-reviewer-err" className="text-xs text-destructive">
              {reviewerError}
            </p>
          )}
        </div>
        <div className="grid content-start gap-1.5">
          <Label htmlFor="r-notes">
            Nota{" "}
            <span className="font-normal text-muted-foreground">
              {isHigh ? "(obligatoria para aprobar)" : "(opcional)"}
            </span>
          </Label>
          <Textarea
            id="r-notes"
            rows={2}
            className="min-h-9 resize-none"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              if (notesError && e.target.value.trim().length >= MIN_HIGH_NOTES) setNotesError(null);
            }}
            aria-invalid={!!notesError}
            aria-describedby={notesError ? "r-notes-err" : undefined}
            placeholder="Por qué tomas esta decisión"
          />
          {notesError && (
            <p id="r-notes-err" className="text-xs text-destructive">
              {notesError}
            </p>
          )}
        </div>
      </div>
      {error ? <ErrorNotice error={error} title="No se registró la decisión" /> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          className="text-destructive hover:bg-destructive-soft hover:text-destructive"
          disabled={pending !== null}
          onClick={() => ensureReviewer() && setConfirmReject(true)}
        >
          {pending === "reject" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <X aria-hidden="true" />}
          Rechazar
        </Button>
        <Button
          className="bg-success text-white hover:bg-success/90"
          disabled={pending !== null}
          onClick={() => ensureReviewer() && ensureNotesForApprove() && submit("approve")}
        >
          {pending === "approve" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
          Aprobar
        </Button>
      </div>

      <AlertDialog open={confirmReject} onOpenChange={setConfirmReject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Rechazar la solicitud de {prospectName}?</AlertDialogTitle>
            <AlertDialogDescription>
              El cliente recibirá un mensaje de rechazo. Esta decisión no se puede deshacer desde aquí.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void submit("reject")}
            >
              Sí, rechazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
