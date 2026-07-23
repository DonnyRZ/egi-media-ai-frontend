"use client";

import { useEffect, useState, type ReactNode } from "react";

import { useRouter } from "@/i18n/navigation";
import { useSessionStore } from "@/shared/session-store";
import { StandardState } from "@/shared/ux-state";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { accessToken, isHydrated, hydrate } = useSessionStore();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    try { hydrate(); } catch { setHasError(true); }
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !accessToken && !hasError) router.replace("/login");
  }, [accessToken, hasError, isHydrated, router]);

  if (hasError) return <StandardState kind="error" title="Session could not be restored" message="Something went wrong while preparing this workspace." onRetry={() => { setHasError(false); hydrate(); }} />;
  if (!isHydrated) return <StandardState kind="loading" message="Restoring your workspace..." />;
  if (!accessToken) return <StandardState kind="unauthorized" title="Sign in to continue" message="Your workspace session is not available." />;
  return <>{children}</>;
}
