import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/features/auth/AuthProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <AuthProvider>{children}</AuthProvider>
      <Toaster position="top-right" richColors={false} closeButton />
    </TooltipProvider>
  );
}
