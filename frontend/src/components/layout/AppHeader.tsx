import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";

export function AppHeader() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-20 border-b bg-primary text-primary-foreground">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-white/10" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-accent" />
        </span>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/70">
            Banco Pichincha
          </span>
          <h1 className="text-base font-semibold tracking-tight whitespace-nowrap">Onboarding Agéntico</h1>
        </div>
        <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">Demo</span>
        <p className="ml-2 hidden min-w-0 truncate text-sm text-primary-foreground/75 md:block">
          Agentes de IA verifican identidad, riesgo y documentos para abrir una cuenta.
        </p>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {user && (
            <span className="hidden items-center gap-1.5 text-sm text-primary-foreground/80 sm:flex">
              <UserRound className="size-4" aria-hidden="true" />
              <span className="max-w-32 truncate">{user}</span>
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground focus-visible:ring-accent/60"
          >
            <LogOut aria-hidden="true" /> Salir
          </Button>
        </div>
      </div>
    </header>
  );
}
