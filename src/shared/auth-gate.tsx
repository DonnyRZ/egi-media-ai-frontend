"use client";

import { useEffect, useState, type ReactNode } from "react";

import { useRouter } from "@/i18n/navigation";
import { useSessionStore } from "@/shared/session-store";
import { StandardState } from "@/shared/ux-state";
import { axiosClient } from "@/shared/lib/axios-client";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import type { ApiSuccessResponse, AuthSessionDto } from "@/shared/types/api.types";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { accessToken, isHydrated, hydrate, setAuthorization } = useSessionStore();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    try { hydrate(); } catch { setHasError(true); }
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !accessToken && !hasError) router.replace("/login");
  }, [accessToken, hasError, isHydrated, router]);

  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    let active = true;
    axiosClient.get<ApiSuccessResponse<AuthSessionDto>>(API_ENDPOINTS.authSession).then((response) => {
      if (!active) return;
      const session = response.data.data;
      setAuthorization({ role: session.role, permissions: session.permissions, tenantId: session.tenant_id, activeCompanyId: session.company_id });
    }).catch(() => { /* The backend remains the final authorization gate; local preview can continue with its session hint. */ });
    return () => { active = false; };
  }, [accessToken, isHydrated, setAuthorization]);

  if (hasError) return <StandardState kind="error" title="Session could not be restored" message="Something went wrong while preparing this workspace." onRetry={() => { setHasError(false); hydrate(); }} />;
  if (!isHydrated) return <StandardState kind="loading" message="Restoring your workspace..." />;
  if (!accessToken) return <StandardState kind="unauthorized" title="Sign in to continue" message="Your workspace session is not available." />;
  return <>{children}</>;
}
