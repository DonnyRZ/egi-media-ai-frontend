"use client";

import type { ReactNode } from "react";

import { usePathname } from "@/i18n/navigation";
import { AuthGate } from "@/shared/auth-gate";
import { AppShell } from "@/shared/app-shell";

const PUBLIC_PATHS = new Set(["/login", "/signup"]);

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (isPublic) return <>{children}</>;
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
