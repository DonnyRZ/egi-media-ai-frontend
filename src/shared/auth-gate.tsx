"use client";

import { useEffect, useState, type ReactNode } from "react";

import { usePathname } from "@/i18n/navigation";
import { useSessionStore } from "@/shared/session-store";
import { StandardState } from "@/shared/ux-state";
import { axiosClient } from "@/shared/lib/axios-client";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import type { ApiSuccessResponse, AuthSessionDto, CompanyOptionDto } from "@/shared/types/api.types";
import { mergeCompanyOptions, toCompanyOptionsFromLogin } from "@/shared/company-options";

const PUBLIC_PATHS = new Set(["/login", "/signup"]);

function sessionCompanies(session: AuthSessionDto): CompanyOptionDto[] {
  const raw = session.authorized_companies;
  if (!Array.isArray(raw)) return [];
  if (raw.length && typeof raw[0] === "string") {
    return (raw as string[]).map((company_id) => ({ company_id, name: null }));
  }
  return toCompanyOptionsFromLogin(raw as Array<CompanyOptionDto & { tenant_id?: string; role?: string }>);
}

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { accessToken, isHydrated, hydrate, setAuthorization, permissions } = useSessionStore();
  const [hasError, setHasError] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    try {
      hydrate();
    } catch {
      setHasError(true);
    }
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated || hasError || accessToken) return;
    if (PUBLIC_PATHS.has(pathname)) return;
    // Soft replace can stall; hard replace guarantees landing on login without the interstitial.
    const locale = window.location.pathname.split("/").filter(Boolean)[0] || "id";
    window.location.replace(`${window.location.origin}/${locale}/login`);
  }, [accessToken, hasError, isHydrated, pathname]);

  useEffect(() => {
    if (!isHydrated || !accessToken) {
      setSessionReady(false);
      return;
    }
    let active = true;
    setSessionReady(useSessionStore.getState().permissions.length > 0);
    axiosClient
      .get<ApiSuccessResponse<AuthSessionDto>>(API_ENDPOINTS.authSession)
      .then((response) => {
        if (!active) return;
        const session = response.data.data;
        const fromSession = sessionCompanies(session);
        const existing = useSessionStore.getState().authorizedCompanies;
        const existingPermissions = useSessionStore.getState().permissions;
        const nextPermissions = Array.isArray(session.permissions) && session.permissions.length > 0
          ? session.permissions
          : existingPermissions;
        setAuthorization({
          role: session.role,
          // Never clobber a populated login/switch session with an empty session payload.
          permissions: nextPermissions,
          tenantId: session.tenant_id,
          activeCompanyId: session.company_id,
          // Preserve login-seeded tenant_id when session omits it.
          authorizedCompanies: mergeCompanyOptions(fromSession, existing),
        });
        setSessionReady(true);
      })
      .catch(() => {
        if (!active) return;
        // Keep login-seeded permissions when session refresh fails; still unblock the shell.
        setSessionReady(true);
      });
    return () => {
      active = false;
    };
  }, [accessToken, isHydrated, setAuthorization]);

  if (hasError) {
    return (
      <StandardState
        kind="error"
        title="Session could not be restored"
        message="Something went wrong while preparing this workspace."
        onRetry={() => {
          setHasError(false);
          hydrate();
        }}
      />
    );
  }
  if (!isHydrated) return <StandardState kind="loading" message="Restoring your session..." />;
  // Unauthenticated on a protected route: keep loading while the redirect effect
  // sends the user to /login. Never paint the unauthorized interstitial here —
  // it flashes on logout and cold loads before soft navigation settles.
  if (!accessToken) return <StandardState kind="loading" message="Redirecting to sign in..." />;
  if (!sessionReady && permissions.length === 0) return <StandardState kind="loading" message="Loading your access..." />;
  return <>{children}</>;
}
