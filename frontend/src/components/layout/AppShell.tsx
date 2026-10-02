import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { Footer } from "./Footer";

/** Full-viewport shell: on desktop the page never scrolls, only the result panel does. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:min-h-0">
      <a
        href="#resultado"
        className="sr-only z-50 rounded-md bg-accent px-3 py-2 text-accent-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al resultado
      </a>
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 sm:px-6 lg:min-h-0 lg:pt-6">{children}</main>
      <Footer />
    </div>
  );
}
