import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/features/auth/AuthProvider";
import { LoginPage } from "@/features/auth/LoginPage";
import { OnboardingForm } from "@/features/onboarding/components/OnboardingForm";
import { ResultPanel } from "@/features/onboarding/components/ResultPanel";
import { useOnboarding } from "@/features/onboarding/hooks/useOnboarding";

export default function App() {
  const { user } = useAuth();
  // The workspace only mounts after login, so scenarios/agents are never fetched anonymously.
  return user === null ? <LoginPage /> : <Workspace />;
}

function Workspace() {
  const o = useOnboarding();

  return (
    <AppShell>
      <div className="grid grid-cols-1 gap-5 lg:h-full lg:grid-cols-[minmax(300px,360px)_1fr] lg:gap-6">
        <aside className="min-w-0 rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgb(15_38_92/0.04)] lg:self-start">
          <OnboardingForm
            scenarios={o.scenarios}
            scenariosError={o.scenariosError}
            onReloadScenarios={o.loadScenarios}
            submitting={o.phase === "submitting"}
            onSubmit={o.start}
          />
        </aside>
        <div id="resultado" className="min-h-0 min-w-0">
          <ResultPanel
            phase={o.phase}
            session={o.session}
            error={o.error}
            canRetry={!!o.lastProspect}
            onRetry={o.retry}
            onReset={o.reset}
            onResolve={o.resolve}
            matrix={o.matrix}
            matrixError={o.matrixError}
            onReloadMatrix={o.loadMatrix}
          />
        </div>
      </div>
    </AppShell>
  );
}
