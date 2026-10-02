import { ApiError } from "../api";

interface Props {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

export function ErrorNotice({ error, onRetry, title }: Props) {
  const message = error instanceof Error ? error.message : "Ocurrió un error inesperado.";
  const details = error instanceof ApiError ? error.details : [];
  const status = error instanceof ApiError && error.status ? error.status : null;
  return (
    <div className="notice notice--error" role="alert">
      <div className="notice__body">
        <p className="notice__title">
          {title ?? "No se pudo completar la operación"}
          {status ? <span className="notice__code">HTTP {status}</span> : null}
        </p>
        <p>{message}</p>
        {details.length > 0 && (
          <ul className="notice__list">
            {details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
      </div>
      {onRetry && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}
