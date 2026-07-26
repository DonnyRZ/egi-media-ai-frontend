"use client";

import { useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { useSessionStore } from "@/shared/session-store";
import type { ScopePrerequisite } from "@/shared/workspace-scope";

type Tenant = { tenant_id: string; name: string };
type Company = { company_id: string; name: string | null };
type Membership = { user_id: string; role: string; status: string; company_id: string | null };

/** What the platform operator still has to do before customer surfaces can open. */
export type ProvisioningStage =
  | { kind: "no-tenant" }
  | { kind: "no-company"; tenantName: string }
  | { kind: "no-owner"; tenantName: string; companyName: string }
  | { kind: "owner-invited"; tenantName: string; companyName: string; email: string }
  | { kind: "owner-active"; tenantName: string; companyName: string; email: string };

export type ScopeGuidance = {
  isLoading: boolean;
  body: string;
  action: { label: string; href: string } | null;
};

/** Membership user ids are `user:<email>` for locally provisioned owners. */
function emailFromUserId(userId: string) {
  return userId.startsWith("user:") ? userId.slice("user:".length) : userId;
}

async function readCompanies(tenantId: string) {
  const response = await axiosClient.get<{ data?: { items?: Company[] } }>(
    API_ENDPOINTS.platformTenantCompanies(tenantId),
    { params: { page: 1, limit: 100 } },
  );
  return response.data?.data?.items ?? [];
}

async function readMemberships(tenantId: string) {
  const response = await axiosClient.get<{ data?: { items?: Membership[] } }>(
    API_ENDPOINTS.platformTenantMemberships(tenantId),
    { params: { page: 1, limit: 100 } },
  );
  return response.data?.data?.items ?? [];
}

function companyName(companies: Company[], companyId: string | null) {
  return companies.find((item) => item.company_id === companyId)?.name || companyId || "the company";
}

/**
 * Walk newest tenants first and stop at the first decisive stage.
 * Prefer an active/invited owner over an incomplete newer tenant so the
 * dialog names the next human step instead of "create a company" wrongly.
 */
async function resolveProvisioningStage(): Promise<ProvisioningStage> {
  const response = await axiosClient.get<{ data?: { items?: Tenant[] } }>(API_ENDPOINTS.platformTenants, {
    params: { page: 1, limit: 20 },
  });
  const tenants = response.data?.data?.items;
  if (!Array.isArray(tenants) || tenants.length === 0) return { kind: "no-tenant" };

  let firstWithoutCompany: ProvisioningStage | null = null;
  let firstWithoutOwner: ProvisioningStage | null = null;
  let invited: Extract<ProvisioningStage, { kind: "owner-invited" }> | null = null;

  for (const tenant of tenants.slice(0, 8)) {
    const [companies, memberships] = await Promise.all([
      readCompanies(tenant.tenant_id).catch(() => [] as Company[]),
      readMemberships(tenant.tenant_id).catch(() => [] as Membership[]),
    ]);

    const activeOwner = memberships.find((item) => item.role === "tenant_owner" && item.status === "active");
    if (activeOwner) {
      return {
        kind: "owner-active",
        tenantName: tenant.name,
        companyName: companyName(companies, activeOwner.company_id),
        email: emailFromUserId(activeOwner.user_id),
      };
    }

    const invitedOwner = memberships.find((item) => item.role === "tenant_owner" && item.status === "invited");
    if (invitedOwner && !invited) {
      invited = {
        kind: "owner-invited",
        tenantName: tenant.name,
        companyName: companyName(companies, invitedOwner.company_id),
        email: emailFromUserId(invitedOwner.user_id),
      };
    }

    if (companies.length === 0) {
      firstWithoutCompany ??= { kind: "no-company", tenantName: tenant.name };
      continue;
    }

    if (!memberships.some((item) => item.role === "tenant_owner")) {
      firstWithoutOwner ??= {
        kind: "no-owner",
        tenantName: tenant.name,
        companyName: companies[0]?.name || "the company",
      };
    }
  }

  if (invited) return invited;
  if (firstWithoutOwner) return firstWithoutOwner;
  if (firstWithoutCompany) return firstWithoutCompany;
  return { kind: "no-tenant" };
}

function copyForStage(stage: ProvisioningStage, missing: ScopePrerequisite): ScopeGuidance {
  const surface = missing === "tenant" ? "This tenant admin surface" : "This company surface";
  switch (stage.kind) {
    case "no-tenant":
      return {
        isLoading: false,
        body: `${surface} runs inside a customer workspace, and no customer tenant exists yet. Create a tenant and its first company in Provisioning, then assign a tenant owner.`,
        action: { label: "Open Provisioning", href: "/settings/platform" },
      };
    case "no-company":
      return {
        isLoading: false,
        body: `${stage.tenantName} exists but has no company yet. Create a company for it in Provisioning, then assign a tenant owner for that company.`,
        action: { label: "Open Provisioning", href: "/settings/platform" },
      };
    case "no-owner":
      return {
        isLoading: false,
        body: `${stage.companyName} (${stage.tenantName}) has no tenant owner yet. Assign an owner email in Provisioning — the owner account is what can open this surface.`,
        action: { label: "Open Provisioning", href: "/settings/platform" },
      };
    case "owner-invited":
      return {
        isLoading: false,
        body: `Nothing left to do in Provisioning: ${stage.companyName} (${stage.tenantName}) already has an owner invite for ${stage.email}, still waiting for signup. Create that account with the exact same email, sign in with it, then pick the company in Company scope.`,
        action: { label: "Open signup page", href: "/signup" },
      };
    case "owner-active":
      return {
        isLoading: false,
        body: `Nothing left to do in Provisioning: ${stage.email} is already the active owner of ${stage.companyName} (${stage.tenantName}). Sign in with that account and pick the company in Company scope. Your platform admin session stays unscoped by design.`,
        action: { label: "Go to sign in", href: "/login" },
      };
  }
}

function fallbackCopy(missing: ScopePrerequisite, hasAuthorizedCompanies: boolean): ScopeGuidance {
  if (missing === "tenant") {
    return {
      isLoading: false,
      body: "This surface manages a customer tenant, and your session has no tenant. Ask a tenant owner or admin to grant you access, or sign in with an account that belongs to that tenant.",
      action: null,
    };
  }
  return {
    isLoading: false,
    body: hasAuthorizedCompanies
      ? "Pick a company in the Company scope switcher at the top, then open this surface again."
      : "Your account is not a member of any company yet. Ask a tenant owner or admin to add you to a company, then pick it in Company scope.",
    action: null,
  };
}

/**
 * Reads real provisioning state so a blocked card can name the one next step,
 * instead of always sending the operator back to Provisioning.
 */
export function useScopeBlockGuidance(enabled: boolean, missing: ScopePrerequisite | null): ScopeGuidance {
  const permissions = useSessionStore((state) => state.permissions);
  const authorizedCompanies = useSessionStore((state) => state.authorizedCompanies);
  const isPlatformOperator = permissions.includes("platform.tenants.manage");
  const shouldQuery = enabled && Boolean(missing) && isPlatformOperator;

  const query = useQuery({
    queryKey: ["scope-block-guidance"],
    enabled: shouldQuery,
    staleTime: 30_000,
    retry: false,
    queryFn: resolveProvisioningStage,
  });

  if (!missing) return { isLoading: false, body: "", action: null };
  if (!isPlatformOperator) return fallbackCopy(missing, authorizedCompanies.length > 0);
  if (query.isLoading) {
    return { isLoading: true, body: "Checking your provisioning state...", action: null };
  }
  if (query.isError || !query.data) {
    return {
      isLoading: false,
      body: "This surface needs a customer workspace scope, and the provisioning state could not be read just now. Open Provisioning to check tenants, companies, and owner assignment.",
      action: { label: "Open Provisioning", href: "/settings/platform" },
    };
  }
  return copyForStage(query.data, missing);
}
