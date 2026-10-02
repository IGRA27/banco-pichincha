import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Footer } from "@/components/layout/Footer";
import { ErrorNotice } from "@/features/onboarding/components/ErrorNotice";
import { useAuth } from "./AuthProvider";

export function LoginPage() {
  const { login, expired } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [missing, setMissing] = useState(false);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!username.trim() || !password) {
      setMissing(true);
      document.getElementById(!username.trim() ? "l-user" : "l-pass")?.focus();
      return;
    }
    setMissing(false);
    setPending(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (e) {
      setError(e);
      setPassword("");
      document.getElementById("l-pass")?.focus();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-[0_1px_2px_rgb(15_38_92/0.04),0_12px_32px_-16px_rgb(15_38_92/0.18)] sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary" aria-hidden="true">
              <span className="size-3 rounded-full bg-accent" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Prueba técnica · Banco Pichincha
              </p>
              <h1 className="text-lg font-semibold tracking-tight">Onboarding Agéntico</h1>
              <p className="text-sm text-muted-foreground">Ingresa para continuar</p>
            </div>
          </div>

          {expired && !error && (
            <Alert className="mb-4 border-warning/30 bg-warning-soft" role="status">
              <AlertDescription className="text-foreground">Tu sesión expiró. Vuelve a ingresar.</AlertDescription>
            </Alert>
          )}
          {error ? <ErrorNotice error={error} title="No pudimos iniciar sesión" className="mb-4" /> : null}

          <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
            <div className="grid gap-1.5">
              <Label htmlFor="l-user">Usuario</Label>
              <Input
                id="l-user"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                aria-invalid={missing && !username.trim()}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="l-pass">Contraseña</Label>
              <div className="relative">
                <Input
                  id="l-pass"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  className="pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={missing && !password}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={show}
                >
                  {show ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>
            {missing && (
              <p className="text-xs text-destructive" role="alert">
                Escribe tu usuario y contraseña.
              </p>
            )}
            <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending} aria-busy={pending}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" /> Ingresando…
                </>
              ) : (
                <>
                  Ingresar <ArrowRight aria-hidden="true" />
                </>
              )}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
