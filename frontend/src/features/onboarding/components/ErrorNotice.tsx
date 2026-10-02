import { AlertCircle, RotateCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApiError } from "../api";

interface Props {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorNotice({ error, title, onRetry, className }: Props) {
  const message = error instanceof Error ? error.message : "Ocurrió un error inesperado.";
  const details = error instanceof ApiError ? error.details : [];
  return (
    <Alert variant="destructive" className={cn("border-destructive/20 bg-destructive-soft", className)}>
      <AlertCircle />
      <AlertTitle className="line-clamp-none">{title ?? "No se pudo completar la operación"}</AlertTitle>
      <AlertDescription className="text-destructive/90">
        <p>{message}</p>
        {details.length > 0 && (
          <ul className="list-disc pl-4 text-xs">
            {details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
        {onRetry && (
          <Button size="sm" variant="outline" className="mt-1 h-7" onClick={onRetry}>
            <RotateCw /> Reintentar
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
