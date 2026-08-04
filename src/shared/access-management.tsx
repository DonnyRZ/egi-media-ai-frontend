"use client";

import { isAxiosError } from "axios";
import { ShieldOff } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { AppSelect } from "@/shared/app-select";
import { axiosClient } from "@/shared/lib/axios-client";
import { ScopeRequired } from "@/shared/prerequisite-gate";
import { useSessionStore } from "@/shared/session-store";
import { useWorkspaceScope } from "@/shared/workspace-scope";
import type { ApiSuccessResponse, CompanyOptionListDto, MembershipDto, MembershipListDto } from "@/shared/types/api.types";

const tenantRoles = ["tenant_admin", "company_admin", "executive", "executive_viewer", "analyst", "reviewer", "viewer"] as const;
const companyRoles = ["company_admin", "executive", "executive_viewer", "analyst", "reviewer", "viewer"] as const;
type CustomerRole = (typeof tenantRoles)[number];

const roleLabels: Record<CustomerRole, string> = {
  tenant_admin: "Tenant admin",
  company_admin: "Company admin",
  executive: "Executive",
  executive_viewer: "Executive viewer",
  analyst: "Analyst",
  reviewer: "Reviewer",
  viewer: "Viewer",
};

const idempotency = (action: string) => `access-${action}-${crypto.randomUUID()}`;

async function listCompanies() {
  const response = await axiosClient.get<ApiSuccessResponse<CompanyOptionListDto>>(API_ENDPOINTS.tenantCompanies);
  return response.data.data.items;
}

function apiMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ error?: { message?: string } }>(error)) return error.response?.data?.error?.message ?? fallback;
  return error instanceof Error ? error.message : fallback;
}

function memberLabel(userId: string) {
  return userId.replace(/^user:/, "");
}

function formatRole(role: string) {
  return roleLabels[role as CustomerRole] ?? role.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function AccessManagement() {
  const scope = useWorkspaceScope();
  const actor = useSessionStore((state) => state.actor);
  const permissions = useSessionStore((state) => state.permissions);
  const activeCompanyId = useSessionStore((state) => state.activeCompanyId);
  const authorizedCompanies = useSessionStore((state) => state.authorizedCompanies);
  const queryClient = useQueryClient();
  const canManageTenantAccess = permissions.includes("tenant.users.manage");
  const canManageCompanyAccess = permissions.includes("company.users.manage");
  const isCompanyScoped = !canManageTenantAccess && canManageCompanyAccess;
  const roles = isCompanyScoped ? companyRoles : tenantRoles;
  const activeCompanyName = authorizedCompanies.find((company) => company.company_id === activeCompanyId)?.name || activeCompanyId || "Active company";
  const membershipQueryKey = isCompanyScoped ? ["company-memberships", activeCompanyId] : ["tenant-memberships"];
  const membershipCollectionEndpoint = isCompanyScoped ? API_ENDPOINTS.companyMemberships : API_ENDPOINTS.tenantMemberships;
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CustomerRole>("analyst");
  const [companyId, setCompanyId] = useState("");
  const [emailError, setEmailError] = useState("");
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<CustomerRole>("analyst");
  const [editingCompanyId, setEditingCompanyId] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const memberships = useQuery({
    queryKey: membershipQueryKey,
    queryFn: async () =>
      (await axiosClient.get<ApiSuccessResponse<MembershipListDto>>(membershipCollectionEndpoint)).data.data,
    retry: false,
    enabled: scope.hasTenant && (!isCompanyScoped || scope.hasCompany),
  });
  const companies = useQuery({
    queryKey: ["tenant-companies"],
    queryFn: listCompanies,
    retry: false,
    enabled: scope.hasTenant && canManageTenantAccess,
  });
  const companyOptions = useMemo(() => {
    const byId = new Map<string, { company_id: string; name: string | null }>();
    for (const company of companies.data ?? []) {
      if (!company.company_id) continue;
      const current = byId.get(company.company_id);
      byId.set(company.company_id, { ...current, ...company, name: company.name ?? current?.name ?? null });
    }
    return [...byId.values()];
  }, [companies.data]);
  const companyNames = useMemo(
    () => new Map(companyOptions.map((company) => [company.company_id, company.name || company.company_id])),
    [companyOptions],
  );
  const revokingMember = memberships.data?.items.find((item) => item.membership_id === revokingId) ?? null;

  const invite = useMutation({
    mutationFn: async () =>
      (
        await axiosClient.post<ApiSuccessResponse<{ membership: MembershipDto; reused: boolean }>>(
          membershipCollectionEndpoint,
          { email: email.trim(), role, ...(isCompanyScoped ? {} : { company_id: companyId || null }) },
          { headers: { "Idempotency-Key": idempotency("invite") } },
        )
      ).data,
    onSuccess: (result) => {
      setEmail("");
      setCompanyId("");
      setRole("analyst");
      setEmailError("");
      setNotice({ kind: "success", text: result.data.reused ? "Access already existed; invitation details updated." : "Invitation created." });
      void queryClient.invalidateQueries({ queryKey: membershipQueryKey });
    },
    onError: (error) => setNotice({ kind: "error", text: apiMessage(error, "Invitation could not be created.") }),
  });

  const update = useMutation({
    mutationFn: async (input: { membershipId: string; version: number; role: CustomerRole; companyId?: string }) =>
      axiosClient.patch(
        isCompanyScoped ? API_ENDPOINTS.companyMembership(input.membershipId) : API_ENDPOINTS.tenantMembership(input.membershipId),
        { role: input.role, ...(isCompanyScoped ? {} : { company_id: input.companyId || null }) },
        { headers: { "Idempotency-Key": idempotency("update"), "If-Match": String(input.version) } },
      ),
    onSuccess: () => {
      setEditingId(null);
      setEmail("");
      setEmailError("");
      setNotice({ kind: "success", text: "Access updated." });
      void queryClient.invalidateQueries({ queryKey: membershipQueryKey });
    },
    onError: (error) => setNotice({ kind: "error", text: apiMessage(error, "Access could not be updated.") }),
  });

  const revoke = useMutation({
    mutationFn: async (item: MembershipDto) =>
      axiosClient.delete(isCompanyScoped ? API_ENDPOINTS.companyMembership(item.membership_id) : API_ENDPOINTS.tenantMembership(item.membership_id), {
        headers: { "Idempotency-Key": idempotency("revoke"), "If-Match": String(item.version) },
      }),
    onSuccess: () => {
      setRevokingId(null);
      setEmail("");
      setEmailError("");
      setNotice({ kind: "success", text: "Access revoked." });
      void queryClient.invalidateQueries({ queryKey: membershipQueryKey });
    },
    onError: (error) => setNotice({ kind: "error", text: apiMessage(error, "Access could not be revoked.") }),
  });

  function submitInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = email.trim();
    if (!normalized || !/^\S+@\S+\.\S+$/.test(normalized)) {
      setEmailError("Enter a valid work email.");
      setNotice(null);
      return;
    }
    setEmailError("");
    setNotice(null);
    invite.mutate();
  }

  function beginEdit(item: MembershipDto) {
    if (item.status === "revoked" || !roles.some((option) => option === item.role)) return;
    setNotice(null);
    setEmailError("");
    setRevokingId(null);
    setEditingId(item.membership_id);
    setEditingRole(item.role as CustomerRole);
    setEditingCompanyId(item.company_id ?? "");
  }

  function displayCompany(company: string | null) {
    if (!company) return "All companies";
    if (isCompanyScoped && company === activeCompanyId) return activeCompanyName;
    return companyNames.get(company) ?? company;
  }

  return (
    <ScopeRequired
      require={isCompanyScoped ? ["tenant", "company"] : "tenant"}
      scope={scope}
      title={isCompanyScoped ? "Company required for access" : "Tenant required for access"}
      reason={isCompanyScoped ? "Company access is managed from the active company scope." : "Membership administration is scoped to a customer tenant. Your session has no tenant assigned yet."}
      nextStep={isCompanyScoped ? "Pick a company in the header switcher, then return to Access." : "Open Platform provisioning to create a tenant and company, then return to Access."}
    >
      {(!canManageTenantAccess && !canManageCompanyAccess) ? (
        <div className="standard-state standard-state-forbidden">
          <h2>Access restricted</h2>
          <p>Your role cannot manage workspace or company memberships.</p>
        </div>
      ) : (
        <div className="access-page access-page-redesign">
          <div className="access-page-heading">
            <div>
              <span className="eyebrow">{isCompanyScoped ? "Company administration" : "Workspace administration"}</span>
              <h1>Access</h1>
            </div>
            <div className="access-heading-meta">
              {isCompanyScoped && <span className="access-company-scope">{activeCompanyName}</span>}
              <span className="access-count">{memberships.data?.meta.total ?? 0} members</span>
            </div>
          </div>

          <section className="access-invite-panel" aria-labelledby="invite-heading">
            <div className="access-section-heading">
              <div>
                <span className="context-label">{isCompanyScoped ? "Add a company member" : "Add a member"}</span>
                <h2 id="invite-heading">Invite access</h2>
              </div>
            </div>
            <form className="access-form access-form-redesign" onSubmit={submitInvite} noValidate>
              <label>
                <span>Work email</span>
                <input
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? "access-email-error" : undefined}
                  autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (emailError) setEmailError("");
                  }}
                  placeholder="person@company.com"
                />
                {emailError && <small id="access-email-error" className="access-field-error">{emailError}</small>}
              </label>
              <label>
                <span>Role</span>
                <AppSelect aria-label="Role" value={role} options={roles.map((item) => ({ value: item, label: roleLabels[item] }))} onChange={setRole} />
              </label>
              {!isCompanyScoped && <label>
                <span>Company access</span>
                <AppSelect
                  aria-label="Company access"
                  value={companyId}
                  options={[{ value: "", label: "All companies" }, ...companyOptions.map((company) => ({ value: company.company_id, label: company.name || company.company_id }))]}
                  onChange={setCompanyId}
                />
              </label>}
              <button className="context-action" type="submit" disabled={invite.isPending}>
                {invite.isPending ? "Inviting…" : "Invite member"}
              </button>
            </form>
          </section>

          {notice && <div className={`access-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>{notice.text}</div>}

          <section className="access-members-panel" aria-labelledby="members-heading">
            <div className="access-section-heading">
              <div>
                <span className="context-label">{isCompanyScoped ? "Company members" : "Workspace members"}</span>
                <h2 id="members-heading">People with access</h2>
              </div>
              <span className="access-section-note">{memberships.data?.items.filter((item) => item.status === "active").length ?? 0} active · {memberships.data?.meta.total ?? 0} total</span>
            </div>
            {memberships.isLoading && <p className="access-list-state">Loading members…</p>}
            {memberships.error && <p className="access-list-state" role="alert">Members are unavailable. Refresh and try again.</p>}
            {!memberships.isLoading && !memberships.error && !memberships.data?.items.length && (
              <p className="access-list-state">No members have been added yet.</p>
            )}
            <div className="access-member-list">
              {memberships.data?.items.map((item) => {
                const label = memberLabel(item.user_id);
                const isSelf = item.user_id === actor?.id || item.user_id === `user:${actor?.email}`;
                const canEdit = roles.some((option) => option === item.role);
                return (
                  <div className="access-member-item" key={item.membership_id}>
                    <div className="access-member-main">
                      <div className="access-member-title">
                        <strong>{label}</strong>
                        {isSelf && <span className="access-self-badge">You</span>}
                      </div>
                      <span>{formatRole(item.role)} · {displayCompany(item.company_id)}</span>
                    </div>
                    <div className="access-member-actions">
                      <span className={`context-status-badge ${item.status !== "active" ? "is-inactive" : ""}`}>{item.status}</span>
                      {canEdit && item.status !== "revoked" && <button className="source-preview-button" type="button" onClick={() => beginEdit(item)}>Edit</button>}
                      {!isSelf && (item.status === "active" || item.status === "invited") && (
                        <button className="source-preview-button source-preview-danger" type="button" onClick={() => { setEditingId(null); setRevokingId(item.membership_id); }}>
                          Revoke
                        </button>
                      )}
                    </div>
                    {editingId === item.membership_id && (
                      <div className="access-edit-panel">
                        <label>
                          <span>Role</span>
                          <AppSelect aria-label={`Edit role for ${label}`} value={editingRole} options={roles.map((option) => ({ value: option, label: roleLabels[option] }))} onChange={setEditingRole} />
                        </label>
                        {!isCompanyScoped && <label>
                          <span>Company access</span>
                          <AppSelect
                            aria-label={`Edit company access for ${label}`}
                            value={editingCompanyId}
                            options={[{ value: "", label: "All companies" }, ...companyOptions.map((company) => ({ value: company.company_id, label: company.name || company.company_id }))]}
                            onChange={setEditingCompanyId}
                          />
                        </label>}
                        <div className="access-edit-actions">
                          <button className="context-action" type="button" disabled={update.isPending} onClick={() => update.mutate({ membershipId: item.membership_id, version: item.version, role: editingRole, ...(isCompanyScoped ? {} : { companyId: editingCompanyId }) })}>
                            {update.isPending ? "Saving…" : "Save changes"}
                          </button>
                          <button className="context-action context-action-secondary" type="button" disabled={update.isPending} onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
          {revokingMember && (
            <div className="context-delete-dialog-backdrop" role="presentation" onClick={() => setRevokingId(null)}>
              <div className="context-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="revoke-access-title" onClick={(event) => event.stopPropagation()}>
                <span className="context-delete-dialog-icon"><ShieldOff size={18} aria-hidden="true" /></span>
                <h2 id="revoke-access-title">Revoke access?</h2>
                <p>{memberLabel(revokingMember.user_id)} will lose {formatRole(revokingMember.role)} access to {displayCompany(revokingMember.company_id)}.</p>
                <div className="context-delete-dialog-actions">
                  <button className="context-action context-action-secondary" type="button" disabled={revoke.isPending} onClick={() => setRevokingId(null)}>Cancel</button>
                  <button className="context-action context-action-danger" type="button" disabled={revoke.isPending} onClick={() => revoke.mutate(revokingMember)}>{revoke.isPending ? "Revoking..." : "Revoke access"}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </ScopeRequired>
  );
}
