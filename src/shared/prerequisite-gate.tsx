"use client";

import type { ReactNode } from "react";

import { Building2, CircleAlert } from "lucide-react";

import { SoftNavLink } from "@/shared/soft-nav";
import { useSessionStore } from "@/shared/session-store";
import type { ScopePrerequisite } from "@/shared/workspace-scope";

export type PrerequisiteGateProps = {
  /** Missing prerequisite(s). First entry drives default copy; all drive which CTAs appear. */
  missing: ScopePrerequisite | ScopePrerequisite[];
  title?: string;
  reason?: string;
  /** Explicit next-step guidance under the reason. */
  nextStep?: string;
  children?: ReactNode;
};

const COPY: Record<
  ScopePrerequisite,
  { eyebrow: string; title: string; reason: string; nextStep: string; mark: string; icon: typeof Building2 }
> = {
  tenant: {
    eyebrow: "Workspace scope",
    title: "Tenant required",
    reason: "This surface needs a customer tenant before it can run. Your session has no tenant yet.",
    nextStep: "Open Platform provisioning to create a tenant (and company), then return here.",
    icon: Building2,
    mark: "⊟",
  },
  company: {
    eyebrow: "Workspace scope",
    title: "Company scope required",
    reason: "An active company is required before this surface can load tenant-scoped data.",
    nextStep: "Pick a company in the header switcher. If none exist, provision one under Platform.",
    icon: CircleAlert,
    mark: "◎",
  },
};

/**
 * Shared blocked-state when tenant/company prerequisites are missing.
 * Reuse from Settings hub cards, draft/alert prefs, exec/issues, etc.
 */
export function PrerequisiteGate({ missing, title, reason, nextStep, children }: PrerequisiteGateProps) {
  const list = Array.isArray(missing) ? missing : [missing];
  const primary = list[0] ?? "tenant";
  const copy = COPY[primary];
  const permissions = useSessionStore((state) => state.permissions);
  const canOpenProvisioning = permissions.includes("platform.tenants.manage");
  const needsProvisioning = canOpenProvisioning && (list.includes("tenant") || list.includes("company"));
  const needsCompanyPicker = list.includes("company");
  const customerNextStep = primary === "tenant"
    ? "Ask a tenant owner or platform administrator to grant this account workspace access."
    : "Select a company from the header, or ask a tenant administrator to grant this account company access.";
  const Mark = copy.icon;

  return (
    <div
      className="standard-state standard-state-forbidden prerequisite-gate"
      role="status"
      data-testid="prerequisite-gate"
      data-missing={list.join(",")}
    >
      <div className="standard-state-mark" aria-hidden="true">
        <Mark size={22} strokeWidth={2} />
      </div>
      <span className="standard-state-eyebrow">{copy.eyebrow}</span>
      <h2>{title ?? copy.title}</h2>
      <p data-testid="prerequisite-gate-reason">{reason ?? copy.reason}</p>
      <p className="prerequisite-gate-next" data-testid="prerequisite-gate-next">
        {canOpenProvisioning ? (nextStep ?? copy.nextStep) : customerNextStep}
      </p>
      <div className="prerequisite-gate-actions">
        {needsProvisioning && (
          <SoftNavLink href="/settings/platform" className="context-action">
            Open Provisioning
          </SoftNavLink>
        )}
        {needsCompanyPicker && (
          <p className="prerequisite-gate-hint" data-testid="prerequisite-gate-company-hint">
            Use the company switcher in the header to set an active company.
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * Early-return wrapper: render children only when every required prerequisite is present.
 * Prefer this for Sprint 1+ page gates so blocked chrome never mounts.
 */
export function ScopeRequired({
  require,
  scope,
  title,
  reason,
  nextStep,
  children,
}: {
  require: ScopePrerequisite | ScopePrerequisite[];
  scope: { hasTenant: boolean; hasCompany: boolean };
  title?: string;
  reason?: string;
  nextStep?: string;
  children: ReactNode;
}) {
  const needed = Array.isArray(require) ? require : [require];
  const unmet = needed.filter((item) => (item === "tenant" ? !scope.hasTenant : !scope.hasCompany));
  if (unmet.length === 0) return <>{children}</>;
  return <PrerequisiteGate missing={unmet} title={title} reason={reason} nextStep={nextStep} />;
}
