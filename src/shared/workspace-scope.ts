"use client";

import { useSessionStore } from "@/shared/session-store";

export type ScopePrerequisite = "tenant" | "company";

export type WorkspaceScope = {
  tenantId: string | null;
  activeCompanyId: string | null;
  isHydrated: boolean;
  hasTenant: boolean;
  hasCompany: boolean;
  /** Highest-priority missing prerequisite, or null when tenant + company are present. */
  missing: ScopePrerequisite | null;
  /** True when both tenant and active company are present. */
  isEligible: boolean;
};

type ScopeSource = {
  tenantId: string | null;
  activeCompanyId: string | null;
  isHydrated: boolean;
};

/** Pure read of workspace eligibility from session fields (usable outside React). */
export function readWorkspaceScope(source: ScopeSource): WorkspaceScope {
  const tenantId = source.tenantId?.trim() || null;
  const activeCompanyId = source.activeCompanyId?.trim() || null;
  const hasTenant = Boolean(tenantId);
  const hasCompany = Boolean(activeCompanyId);
  const missing: ScopePrerequisite | null = !hasTenant ? "tenant" : !hasCompany ? "company" : null;
  return {
    tenantId,
    activeCompanyId,
    isHydrated: source.isHydrated,
    hasTenant,
    hasCompany,
    missing,
    isEligible: hasTenant && hasCompany,
  };
}

/** Session-backed workspace scope for eligible vs blocked UI gates. */
export function useWorkspaceScope(): WorkspaceScope {
  const tenantId = useSessionStore((state) => state.tenantId);
  const activeCompanyId = useSessionStore((state) => state.activeCompanyId);
  const isHydrated = useSessionStore((state) => state.isHydrated);
  return readWorkspaceScope({ tenantId, activeCompanyId, isHydrated });
}

/** Returns true when every listed prerequisite is satisfied. */
export function hasScopePrerequisites(
  scope: Pick<WorkspaceScope, "hasTenant" | "hasCompany">,
  require: ScopePrerequisite | ScopePrerequisite[],
): boolean {
  const needed = Array.isArray(require) ? require : [require];
  return needed.every((item) => (item === "tenant" ? scope.hasTenant : scope.hasCompany));
}
