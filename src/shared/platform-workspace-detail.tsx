"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { AppSelect } from "@/shared/app-select";
import { displayCompanyName } from "@/shared/company-options";
import { axiosClient } from "@/shared/lib/axios-client";
import { useFocusTrap } from "@/shared/focus-trap";
import { PermissionGate } from "@/shared/permission-guard";
import {
  ACTION_META,
  ACTION_TARGET_STATUS,
  LIFECYCLE_ACTIONS,
  STATUS_META,
  errorMessage,
  idempotencyKey,
  isTenantStatus,
  membershipEmail,
  normalizeTenant,
  type Company,
  type LifecycleAction,
  type Membership,
  type Tenant,
  type TenantStatus,
} from "@/shared/platform-tenant-shared";
import { StatusBadge } from "@/shared/platform-status-badge";
import { useSessionStore } from "@/shared/session-store";
import { SoftNavLink } from "@/shared/soft-nav";
import { BusyLabel, CollectionLoading } from "@/shared/ux-state";

type TenantResponse = { data?: { tenant?: Tenant } };

type OwnerNextSteps = { email: string; companyName: string; companyId: string };

const companiesKey = (tenantId: string) => ["platform-tenant-companies", tenantId] as const;
const membershipsKey = (tenantId: string) => ["platform-tenant-memberships", tenantId] as const;
const ownerNextStepsKey = (tenantId: string) => `egi_media_ai_workspace_owner_next_steps_${tenantId}`;

function readPersistedNextSteps(tenantId: string): OwnerNextSteps | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ownerNextStepsKey(tenantId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OwnerNextSteps;
    return parsed?.email ? parsed : null;
  } catch {
    return null;
  }
}

function persistNextSteps(tenantId: string, next: OwnerNextSteps | null) {
  if (typeof window === "undefined") return;
  if (!next) {
    window.sessionStorage.removeItem(ownerNextStepsKey(tenantId));
    return;
  }
  window.sessionStorage.setItem(ownerNextStepsKey(tenantId), JSON.stringify(next));
}

export function PlatformWorkspaceDetail({ tenantId }: { tenantId: string }) {
  const client = useQueryClient();
  const canManagePlatform = useSessionStore((state) => state.permissions.includes("platform.tenants.manage"));
  const [company, setCompany] = useState("");
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [addOwnerOpen, setAddOwnerOpen] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerCompanyId, setOwnerCompanyId] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [notice, setNotice] = useState("");
  const [ownerNextSteps, setOwnerNextSteps] = useState<OwnerNextSteps | null>(() => readPersistedNextSteps(tenantId));
  const [lifecycleAction, setLifecycleAction] = useState<LifecycleAction | null>(null);
  const [lifecycleReason, setLifecycleReason] = useState("");
  const [lifecycleError, setLifecycleError] = useState("");
  const lifecycleModalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    persistNextSteps(tenantId, ownerNextSteps);
  }, [tenantId, ownerNextSteps]);

  const tenantQuery = useQuery({
    queryKey: ["platform-tenant", tenantId],
    enabled: canManagePlatform,
    queryFn: async () => {
      const response = await axiosClient.get<{ data?: { items?: Tenant[] } }>(API_ENDPOINTS.platformTenants, {
        params: { page: 1, limit: 5, q: tenantId },
      });
      const items = response.data?.data?.items;
      if (!Array.isArray(items)) throw new Error("Workspace lookup response was invalid");
      const match = items.find((item) => item.tenant_id === tenantId);
      return match ? normalizeTenant(match) : null;
    },
    retry: 2,
  });

  const tenant = tenantQuery.data ?? null;

  const companies = useQuery({
    queryKey: companiesKey(tenantId),
    enabled: canManagePlatform,
    queryFn: async () => {
      const response = await axiosClient.get<{ data?: { items?: Company[] } }>(API_ENDPOINTS.platformTenantCompanies(tenantId), {
        params: { page: 1, limit: 100 },
      });
      const items = response.data?.data?.items;
      if (!Array.isArray(items)) throw new Error("Company list response was invalid");
      return items;
    },
    retry: 2,
    refetchOnMount: "always",
  });

  const memberships = useQuery({
    queryKey: membershipsKey(tenantId),
    enabled: canManagePlatform,
    queryFn: async () => {
      const response = await axiosClient.get<{ data?: { items?: Membership[] } }>(API_ENDPOINTS.platformTenantMemberships(tenantId), {
        params: { page: 1, limit: 100 },
      });
      const items = response.data?.data?.items;
      if (!Array.isArray(items)) throw new Error("Membership list response was invalid");
      return items;
    },
    retry: 2,
    refetchOnMount: "always",
  });

  const selectedCanProvision = Boolean(tenant && (tenant.status === "active" || tenant.status === "pending"));
  const ownerMemberships = (memberships.data || []).filter((item) => item.role === "tenant_owner");
  const ownerMembership =
    ownerMemberships.find((item) => item.status === "active") || ownerMemberships.find((item) => item.status === "invited");
  const ownerIsActive = ownerMembership?.status === "active";

  useEffect(() => {
    if (!ownerIsActive || !ownerNextSteps) return;
    setOwnerNextSteps(null);
  }, [ownerIsActive, ownerNextSteps]);

  const createCompany = useMutation({
    mutationFn: async () =>
      (await axiosClient.post(API_ENDPOINTS.platformTenantCompanies(tenantId), { name: company.trim() }, { headers: { "Idempotency-Key": idempotencyKey() } })).data,
    onSuccess: () => {
      setCompany("");
      setAddCompanyOpen(false);
      setOwnerNextSteps(null);
      setNotice("Company created.");
      void client.invalidateQueries({ queryKey: companiesKey(tenantId) });
    },
  });

  const assignOwner = useMutation({
    mutationFn: async () =>
      (
        await axiosClient.post(
          API_ENDPOINTS.platformTenantOwner(tenantId),
          { email: ownerEmail.trim(), company_id: ownerCompanyId.trim(), ...(ownerFullName.trim() ? { full_name: ownerFullName.trim() } : {}) },
          { headers: { "Idempotency-Key": idempotencyKey() } },
        )
      ).data,
    onSuccess: () => {
      const email = ownerEmail.trim().toLowerCase();
      const companyRow = companies.data?.find((item) => item.company_id === ownerCompanyId);
      setOwnerNextSteps({ email, companyId: ownerCompanyId, companyName: displayCompanyName(companyRow || { company_id: ownerCompanyId, name: null }) });
      setOwnerEmail("");
      setOwnerCompanyId("");
      setOwnerFullName("");
      setAddOwnerOpen(false);
      setNotice("");
      void client.invalidateQueries({ queryKey: membershipsKey(tenantId) });
    },
  });

  const lifecycleMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: TenantStatus; reason: string }) => {
      const response = await axiosClient.patch<TenantResponse>(
        API_ENDPOINTS.platformTenant(tenantId),
        { status, ...(reason ? { reason } : {}) },
        { headers: { "Idempotency-Key": idempotencyKey() } },
      );
      return response.data.data?.tenant ? normalizeTenant(response.data.data.tenant) : null;
    },
    onSuccess: (updatedTenant) => {
      if (updatedTenant) {
        client.setQueryData(["platform-tenant", tenantId], updatedTenant);
        void client.invalidateQueries({ queryKey: ["platform-tenants"] });
      }
      setNotice(updatedTenant ? `${updatedTenant.name} is now ${STATUS_META[updatedTenant.status].label.toLowerCase()}.` : "Workspace status updated.");
      setLifecycleAction(null);
      setLifecycleReason("");
      setLifecycleError("");
    },
  });

  const canAssign = Boolean(selectedCanProvision && ownerEmail.trim() && ownerCompanyId.trim() && !assignOwner.isPending);

  function beginLifecycleAction(action: LifecycleAction) {
    lifecycleMutation.reset();
    setLifecycleError("");
    setLifecycleReason("");
    setLifecycleAction(action);
  }

  const closeLifecycleDialog = useCallback(() => {
    if (lifecycleMutation.isPending) return;
    setLifecycleAction(null);
    setLifecycleReason("");
    setLifecycleError("");
  }, [lifecycleMutation.isPending]);
  useFocusTrap(lifecycleModalRef, Boolean(lifecycleAction && tenant), closeLifecycleDialog);

  function submitLifecycle() {
    if (!tenant || !lifecycleAction) return;
    const meta = ACTION_META[lifecycleAction];
    if (meta.requiresReason && !lifecycleReason.trim()) {
      setLifecycleError("Add a reason so this lifecycle change is recorded clearly.");
      return;
    }
    setLifecycleError("");
    lifecycleMutation.mutate({ status: ACTION_TARGET_STATUS[lifecycleAction], reason: lifecycleReason.trim() });
  }

  return (
    <PermissionGate
      permission="platform.tenants.manage"
      fallback={<div className="standard-state standard-state-forbidden"><h2>Platform administration only</h2><p>This control plane is not part of a customer workspace.</p></div>}
    >
      <div className="platform-console">
        <SoftNavLink href="/settings/platform" className="platform-back-link">
          ← Workspace registry
        </SoftNavLink>

        {tenantQuery.isLoading && <CollectionLoading label="Loading workspace..." rows={5} className="platform-registry-loading" />}

        {!tenantQuery.isLoading && tenantQuery.error && (
          <div className="platform-empty" role="alert">
            <strong>Workspace could not be loaded</strong>
            <p>The control plane did not return this workspace.</p>
            <button
              type="button"
              className="platform-secondary-button"
              aria-busy={tenantQuery.isFetching}
              data-loading={tenantQuery.isFetching}
              disabled={tenantQuery.isFetching}
              onClick={() => void tenantQuery.refetch()}
            >
              {tenantQuery.isFetching ? <BusyLabel>Retrying…</BusyLabel> : "Retry"}
            </button>
          </div>
        )}

        {!tenantQuery.isLoading && !tenantQuery.error && !tenant && (
          <div className="platform-empty">
            <strong>Workspace not found</strong>
            <p>It may have been renamed, or this link is out of date.</p>
          </div>
        )}

        {tenant && (
          <>
            <header className="platform-console-header platform-detail-page-header">
              <div className="platform-console-header-row">
                <div>
                  <p className="platform-eyebrow">Platform control plane</p>
                  <h1>{tenant.name}</h1>
                  <p className="platform-tenant-id-line">{tenant.tenant_id}</p>
                </div>
                <StatusBadge status={tenant.status} />
              </div>
            </header>

            <div className={`platform-lifecycle-banner is-${tenant.status}`} role="status">
              <div>
                <span>Workspace status</span>
                <strong>{STATUS_META[tenant.status].label}</strong>
              </div>
              <p>{STATUS_META[tenant.status].description}</p>
            </div>

            <div className="platform-lifecycle-toolbar" aria-label="Workspace lifecycle actions">
              {LIFECYCLE_ACTIONS[tenant.status].filter((action) => ACTION_META[action].intent === "primary").length > 0 && (
                <div className="platform-lifecycle-group">
                  {LIFECYCLE_ACTIONS[tenant.status]
                    .filter((action) => ACTION_META[action].intent === "primary")
                    .map((action) => (
                      <button type="button" key={action} className="platform-action-button" onClick={() => beginLifecycleAction(action)}>
                        {ACTION_META[action].label}
                      </button>
                    ))}
                </div>
              )}
              {LIFECYCLE_ACTIONS[tenant.status].filter((action) => ACTION_META[action].intent === "danger").length > 0 && (
                <div className="platform-lifecycle-group is-danger">
                  <span className="platform-danger-label">Danger zone</span>
                  {LIFECYCLE_ACTIONS[tenant.status]
                    .filter((action) => ACTION_META[action].intent === "danger")
                    .map((action) => (
                      <button type="button" key={action} className="platform-action-button is-danger" onClick={() => beginLifecycleAction(action)}>
                        {ACTION_META[action].label}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {notice && !ownerNextSteps && <p className="platform-inline-status" role="status">{notice}</p>}

            <section className="platform-section" aria-labelledby="provisioning-heading">
              <div className="platform-section-header">
                <div>
                  <p className="platform-section-kicker">Provisioning</p>
                  <h2 id="provisioning-heading">Setup progress</h2>
                </div>
              </div>

              {!selectedCanProvision && (
                <div className="platform-readonly-callout">
                  <strong>Provisioning paused</strong>
                  <span>Company and owner changes are unavailable while this workspace is {tenant.status}. Select Resume or Restore above to continue.</span>
                </div>
              )}

              <div className={`platform-form-section ${createCompany.isPending ? "is-mutating" : ""}`} aria-busy={companies.isLoading || createCompany.isPending}>
                <div className="platform-form-section-heading">
                  <div>
                    <h3>Companies</h3>
                    <p>Companies define the customer scope inside this workspace.</p>
                  </div>
                  {selectedCanProvision && Boolean(companies.data?.length) && (
                    <button type="button" className="platform-secondary-button" onClick={() => setAddCompanyOpen((value) => !value)}>
                      {addCompanyOpen ? "Cancel" : "+ Add company"}
                    </button>
                  )}
                </div>
                {companies.isLoading && <CollectionLoading label="Loading companies..." rows={2} className="platform-company-loading" />}
                {companies.error && (
                  <div className="platform-empty" role="alert">
                    <strong>Companies could not be loaded</strong>
                    <button
                      type="button"
                      className="platform-secondary-button"
                      aria-busy={companies.isFetching}
                      data-loading={companies.isFetching}
                      disabled={companies.isFetching}
                      onClick={() => void companies.refetch()}
                    >
                      {companies.isFetching ? <BusyLabel>Retrying…</BusyLabel> : "Retry"}
                    </button>
                  </div>
                )}
                {!companies.isLoading && !companies.error && companies.data?.length === 0 && (
                  <div className="platform-empty">
                    <strong>No company provisioned</strong>
                    <p>Add the first company before assigning an owner.</p>
                  </div>
                )}
                {companies.data && companies.data.length > 0 && (
                  <>
                    <div className="platform-company-list-header">
                      <span>Existing companies</span>
                      <span className="platform-company-count">{companies.data.length}</span>
                    </div>
                    <div className="platform-company-list">
                      {companies.data.map((item) => (
                        <div className="platform-company-row" key={item.company_id}>
                          <div>
                            <strong>{displayCompanyName(item)}</strong>
                            <br />
                            <small>{item.company_id}</small>
                          </div>
                          <StatusBadge status={isTenantStatus(item.status) ? item.status : "active"} />
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {selectedCanProvision && (companies.data?.length === 0 || addCompanyOpen) && (
                  <form
                    className="platform-inline-form platform-add-company-form"
                    aria-busy={createCompany.isPending}
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (company.trim()) createCompany.mutate();
                    }}
                  >
                    <div className="platform-field">
                      <label htmlFor="company-name">Company name</label>
                      <input
                        id="company-name"
                        aria-label="Company name"
                        value={company}
                        onChange={(event) => setCompany(event.target.value)}
                        placeholder="Customer company name"
                        autoFocus={addCompanyOpen}
                      />
                    </div>
                    <button type="submit" className="platform-primary-button" data-loading={createCompany.isPending} disabled={!company.trim() || createCompany.isPending}>
                      {createCompany.isPending ? "Creating…" : "Create company"}
                    </button>
                  </form>
                )}
                {createCompany.isError && (
                  <p className="platform-form-error" role="alert">
                    Company could not be created. {errorMessage(createCompany.error, "Check the name and try again.")}
                  </p>
                )}
              </div>

              <div className={`platform-form-section ${assignOwner.isPending ? "is-mutating" : ""}`} aria-busy={memberships.isLoading || assignOwner.isPending}>
                {companies.data && companies.data.length > 0 ? (
                  <>
                    <div className="platform-form-section-heading">
                      <div>
                        <h3>Tenant owner</h3>
                        <p>Invite the person who will manage this customer workspace.</p>
                      </div>
                      {selectedCanProvision && ownerMemberships.length > 0 && (
                        <button type="button" className="platform-secondary-button" onClick={() => setAddOwnerOpen((value) => !value)}>
                          {addOwnerOpen ? "Cancel" : "+ Add owner"}
                        </button>
                      )}
                    </div>

                    {!selectedCanProvision && (
                      <div className="platform-readonly-panel">
                        <strong>Owner changes are paused</strong>
                        <span>The current workspace status is {STATUS_META[tenant.status].label.toLowerCase()}. Existing ownership remains available for audit.</span>
                      </div>
                    )}

                    {memberships.isLoading && <CollectionLoading label="Loading tenant owner..." rows={1} className="platform-company-loading" />}

                    {ownerMemberships.length > 0 && (
                      <>
                        <div className="platform-company-list-header">
                          <span>Existing owners</span>
                          <span className="platform-company-count">{ownerMemberships.length}</span>
                        </div>
                        <div className="platform-company-list">
                          {ownerMemberships.map((item) => {
                            const scopedCompany = item.company_id ? companies.data?.find((candidate) => candidate.company_id === item.company_id) : null;
                            return (
                              <div className="platform-company-row" key={item.membership_id}>
                                <div>
                                  <strong>{item.full_name || membershipEmail(item)}</strong>
                                  <br />
                                  <small>
                                    {item.full_name ? `${membershipEmail(item)} · ` : ""}
                                    {item.company_id ? displayCompanyName(scopedCompany || { company_id: item.company_id, name: null }) : "All companies"}
                                  </small>
                                </div>
                                <span className={`platform-tenant-status is-${item.status === "active" ? "active" : "pending"}`}>
                                  <i aria-hidden="true" />
                                  {item.status === "active" ? "Active" : item.status === "invited" ? "Invited" : item.status}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {selectedCanProvision && (ownerMemberships.length === 0 || addOwnerOpen) && (
                      <form
                        className="platform-owner-form platform-add-owner-form"
                        aria-busy={assignOwner.isPending}
                        onSubmit={(event) => {
                          event.preventDefault();
                          if (canAssign) assignOwner.mutate();
                        }}
                      >
                        <div className="platform-field">
                          <label htmlFor="owner-email">Owner email</label>
                          <input
                            id="owner-email"
                            aria-label="Owner email"
                            type="email"
                            value={ownerEmail}
                            onChange={(event) => setOwnerEmail(event.target.value)}
                            placeholder="owner@company.com"
                            autoFocus={addOwnerOpen}
                          />
                        </div>
                        <div className="platform-field">
                          <label htmlFor="owner-name">
                            Full name <span>(optional)</span>
                          </label>
                          <input
                            id="owner-name"
                            aria-label="Owner full name"
                            value={ownerFullName}
                            onChange={(event) => setOwnerFullName(event.target.value)}
                            placeholder="Full name"
                          />
                        </div>
                        <div className="platform-field">
                          <label htmlFor="owner-company">Company</label>
                          <AppSelect
                            id="owner-company"
                            aria-label="Owner company"
                            value={ownerCompanyId}
                            options={[{ value: "", label: "Select company" }, ...companies.data.map((item) => ({ value: item.company_id, label: displayCompanyName(item) }))]}
                            onChange={setOwnerCompanyId}
                          />
                        </div>
                        <button type="submit" className="platform-primary-button" data-loading={assignOwner.isPending} disabled={!canAssign}>
                          {assignOwner.isPending ? "Assigning…" : "Assign owner"}
                        </button>
                      </form>
                    )}
                    {assignOwner.isError && (
                      <p className="platform-form-error" role="alert">
                        Owner could not be assigned. {errorMessage(assignOwner.error, "Check the email and selected company.")}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="platform-empty platform-owner-locked">
                    <strong>Owner assignment unlocks after a company is created</strong>
                    <p>There is no company to attach the tenant owner to yet.</p>
                  </div>
                )}
              </div>
            </section>

            {ownerNextSteps && !ownerIsActive && (
              <section className="platform-success" data-testid="provisioning-owner-next-steps" role="status">
                <strong>Tenant owner assigned</strong>
                <span>
                  {ownerNextSteps.email} can access {ownerNextSteps.companyName} after signing up with this exact email.
                </span>
                <SoftNavLink href="/signup">Open signup page</SoftNavLink>
              </section>
            )}

            {lifecycleAction && (
              <div
                className="platform-modal-backdrop"
                role="presentation"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) closeLifecycleDialog();
                }}
              >
                <section
                  ref={lifecycleModalRef}
                  className="platform-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="lifecycle-dialog-title"
                  aria-describedby="lifecycle-dialog-description"
                >
                  <div className="platform-modal-heading">
                    <div className={`platform-modal-icon is-${ACTION_META[lifecycleAction].intent}`} aria-hidden="true">
                      {ACTION_META[lifecycleAction].intent === "danger" ? "!" : "✓"}
                    </div>
                    <div>
                      <p className="platform-eyebrow">Workspace lifecycle</p>
                      <h2 id="lifecycle-dialog-title">{ACTION_META[lifecycleAction].title}</h2>
                      <p id="lifecycle-dialog-description">{ACTION_META[lifecycleAction].description}</p>
                    </div>
                  </div>
                  <div className="platform-modal-workspace">
                    <strong>{tenant.name}</strong>
                    <StatusBadge status={tenant.status} />
                  </div>
                  <form
                    aria-busy={lifecycleMutation.isPending}
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitLifecycle();
                    }}
                  >
                    {ACTION_META[lifecycleAction].requiresReason && (
                      <label className="platform-modal-field" htmlFor="lifecycle-reason">
                        <span>
                          Reason <em>Required</em>
                        </span>
                        <textarea
                          id="lifecycle-reason"
                          value={lifecycleReason}
                          onChange={(event) => setLifecycleReason(event.target.value)}
                          placeholder="For example: subscription ended or payment is overdue"
                          maxLength={500}
                          autoFocus
                        />
                        <small>{lifecycleReason.length}/500</small>
                      </label>
                    )}
                    {(lifecycleError || lifecycleMutation.isError) && (
                      <p className="platform-form-error" role="alert">
                        {lifecycleError || errorMessage(lifecycleMutation.error, "Workspace status could not be updated.")}
                      </p>
                    )}
                    <div className="platform-modal-actions">
                      <button type="button" className="platform-secondary-button" onClick={closeLifecycleDialog} disabled={lifecycleMutation.isPending}>
                        Cancel
                      </button>
                      <button
                        type="submit"
                        autoFocus={!ACTION_META[lifecycleAction].requiresReason}
                        className={`platform-primary-button ${ACTION_META[lifecycleAction].intent === "danger" ? "is-danger" : ""}`}
                        aria-busy={lifecycleMutation.isPending}
                        data-loading={lifecycleMutation.isPending}
                        disabled={lifecycleMutation.isPending}
                      >
                        {lifecycleMutation.isPending ? <BusyLabel>Updating…</BusyLabel> : ACTION_META[lifecycleAction].label}
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </PermissionGate>
  );
}
