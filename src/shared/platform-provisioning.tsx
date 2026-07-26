"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "@/shared/lib/axios-client";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { PermissionGate } from "@/shared/permission-guard";
import { SoftNavLink } from "@/shared/soft-nav";

type Tenant = { tenant_id: string; name: string; status: string };
type Company = { company_id: string; name: string | null; status?: string };

type OwnerNextSteps = {
  email: string;
  companyName: string;
  companyId: string;
  tenantName: string;
};

const key = () => crypto.randomUUID();
const companiesKey = (tenantId: string) => ["platform-tenant-companies", tenantId] as const;
const SELECTED_TENANT_KEY = "egi_media_ai_provisioning_selected_tenant";
const OWNER_NEXT_STEPS_KEY = "egi_media_ai_provisioning_owner_next_steps";

function readPersistedTenant(): Tenant | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SELECTED_TENANT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Tenant;
    return parsed?.tenant_id ? parsed : null;
  } catch {
    return null;
  }
}

function persistTenant(tenant: Tenant | null) {
  if (typeof window === "undefined") return;
  if (!tenant) {
    window.sessionStorage.removeItem(SELECTED_TENANT_KEY);
    return;
  }
  window.sessionStorage.setItem(SELECTED_TENANT_KEY, JSON.stringify(tenant));
}

function readPersistedNextSteps(): OwnerNextSteps | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(OWNER_NEXT_STEPS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OwnerNextSteps;
    return parsed?.email ? parsed : null;
  } catch {
    return null;
  }
}

function persistNextSteps(next: OwnerNextSteps | null) {
  if (typeof window === "undefined") return;
  if (!next) {
    window.sessionStorage.removeItem(OWNER_NEXT_STEPS_KEY);
    return;
  }
  window.sessionStorage.setItem(OWNER_NEXT_STEPS_KEY, JSON.stringify(next));
}

export function PlatformProvisioning() {
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [selected, setSelected] = useState<Tenant | null>(() => readPersistedTenant());
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerCompanyId, setOwnerCompanyId] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [notice, setNotice] = useState("");
  const [ownerNextSteps, setOwnerNextSteps] = useState<OwnerNextSteps | null>(() => readPersistedNextSteps());

  useEffect(() => {
    persistTenant(selected);
  }, [selected]);

  useEffect(() => {
    persistNextSteps(ownerNextSteps);
  }, [ownerNextSteps]);

  const tenants = useQuery({
    queryKey: ["platform-tenants"],
    queryFn: async () => {
      const response = await axiosClient.get<{ data?: { items?: Tenant[] } }>(API_ENDPOINTS.platformTenants, {
        params: { page: 1, limit: 100 },
      });
      const items = response.data?.data?.items;
      if (!Array.isArray(items)) throw new Error("Tenant list response was invalid");
      return items;
    },
    retry: 2,
    refetchOnMount: "always",
  });

  const companies = useQuery({
    queryKey: companiesKey(selected?.tenant_id || ""),
    enabled: Boolean(selected?.tenant_id),
    queryFn: async () => {
      const response = await axiosClient.get<{ data?: { items?: Company[] } }>(
        API_ENDPOINTS.platformTenantCompanies(selected!.tenant_id),
        { params: { page: 1, limit: 100 } },
      );
      const items = response.data?.data?.items;
      if (!Array.isArray(items)) throw new Error("Company list response was invalid");
      return items;
    },
    retry: 2,
    refetchOnMount: "always",
  });

  const createTenant = useMutation({
    mutationFn: async () =>
      (await axiosClient.post(API_ENDPOINTS.platformTenants, { name, status: "active" }, { headers: { "Idempotency-Key": key() } })).data,
    onSuccess: () => {
      setName("");
      setOwnerNextSteps(null);
      setNotice("Tenant created. Next: create a company, then assign a tenant owner for that company.");
      client.invalidateQueries({ queryKey: ["platform-tenants"] });
    },
  });

  const createCompany = useMutation({
    mutationFn: async () =>
      (await axiosClient.post(
        API_ENDPOINTS.platformTenantCompanies(selected!.tenant_id),
        { name: company, status: "active" },
        { headers: { "Idempotency-Key": key() } },
      )).data,
    onSuccess: () => {
      setCompany("");
      setOwnerNextSteps(null);
      setNotice("Company created. Next: assign a tenant owner with this company selected — the company will not appear in your platform switcher.");
      if (selected) client.invalidateQueries({ queryKey: companiesKey(selected.tenant_id) });
    },
  });

  const assignOwner = useMutation({
    mutationFn: async () =>
      (await axiosClient.post(
        API_ENDPOINTS.platformTenantOwner(selected!.tenant_id),
        {
          email: ownerEmail.trim(),
          company_id: ownerCompanyId.trim(),
          ...(ownerFullName.trim() ? { full_name: ownerFullName.trim() } : {}),
        },
        { headers: { "Idempotency-Key": key() } },
      )).data,
    onSuccess: () => {
      const email = ownerEmail.trim().toLowerCase();
      const companyRow = companies.data?.find((item) => item.company_id === ownerCompanyId);
      setOwnerNextSteps({
        email,
        companyId: ownerCompanyId,
        companyName: companyRow?.name || ownerCompanyId,
        tenantName: selected?.name || "this tenant",
      });
      setOwnerEmail("");
      setOwnerCompanyId("");
      setOwnerFullName("");
      setNotice("");
    },
  });

  const canAssign = Boolean(ownerEmail.trim() && ownerCompanyId.trim() && !assignOwner.isPending);

  function selectTenant(tenant: Tenant) {
    setSelected(tenant);
    persistTenant(tenant);
    setOwnerCompanyId("");
    setNotice("");
    setOwnerNextSteps(null);
  }

  return (
    <PermissionGate
      permission="platform.tenants.manage"
      fallback={
        <div className="standard-state standard-state-forbidden">
          <h2>Platform administration only</h2>
          <p>This control plane is not part of a customer workspace.</p>
        </div>
      }
    >
      <div className="settings-hub">
        <div className="eyebrow">Platform control plane</div>
        <h1>Customer provisioning</h1>
        <p>Create customer tenants and their first company without coupling them to EGI Holding.</p>

        <section className="access-invite-card">
          <strong>Create tenant</strong>
          <div className="access-form">
            <input aria-label="Tenant name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Customer legal/workspace name" />
            <button className="context-action" disabled={!name.trim() || createTenant.isPending} onClick={() => createTenant.mutate()}>
              Create tenant
            </button>
          </div>
        </section>

        <section className="access-list-card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Customer tenants</div>
              <h2>Provisioned workspaces</h2>
            </div>
          </div>
          {tenants.isLoading && <p>Loading tenants...</p>}
          {tenants.error && (
            <p role="alert">
              Could not load tenants.{" "}
              <button type="button" className="source-preview-button" onClick={() => void tenants.refetch()}>
                Retry
              </button>
            </p>
          )}
          {!tenants.isLoading && !tenants.error && tenants.data?.length === 0 && <p>No tenants yet</p>}
          {tenants.data?.map((tenant) => (
            <div className="access-row" key={tenant.tenant_id}>
              <div>
                <strong>{tenant.name}</strong>
                <span>
                  {tenant.tenant_id} · {tenant.status}
                </span>
              </div>
              <button className="source-preview-button" onClick={() => selectTenant(tenant)}>
                Select
              </button>
            </div>
          ))}
        </section>

        {selected && (
          <>
            <section className="access-list-card">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">Companies</div>
                  <h2>Companies for {selected.name}</h2>
                </div>
              </div>
              {companies.isLoading && <p>Loading companies...</p>}
              {companies.error && (
                <p role="alert">
                  Could not load companies.{" "}
                  <button type="button" className="source-preview-button" onClick={() => void companies.refetch()}>
                    Retry
                  </button>
                </p>
              )}
              {!companies.isLoading && !companies.error && companies.data?.length === 0 && <p>No companies yet</p>}
              {companies.data?.map((item) => (
                <div className="access-row" key={item.company_id}>
                  <div>
                    <strong>{item.name || item.company_id}</strong>
                    <span>
                      {item.company_id} · {item.status || "active"}
                    </span>
                  </div>
                </div>
              ))}
            </section>

            <section className="access-invite-card">
              <strong>Create company for {selected.name}</strong>
              <div className="access-form">
                <input aria-label="Company name" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Company name" />
                <button className="context-action" disabled={!company.trim() || createCompany.isPending} onClick={() => createCompany.mutate()}>
                  Create company
                </button>
              </div>
            </section>

            <section className="access-invite-card">
              <strong>Assign tenant owner</strong>
              <p className="provisioning-hint">
                Choose the company the owner should see in their switcher. Membership stays <em>invited</em> until they sign up with the same email; signup activates access.
              </p>
              <div className="access-form access-form-owner">
                <input
                  aria-label="Owner email"
                  type="email"
                  value={ownerEmail}
                  onChange={(event) => setOwnerEmail(event.target.value)}
                  placeholder="owner@company.com"
                />
                <input
                  aria-label="Owner full name"
                  value={ownerFullName}
                  onChange={(event) => setOwnerFullName(event.target.value)}
                  placeholder="Full name (optional)"
                />
                <select aria-label="Owner company" value={ownerCompanyId} onChange={(event) => setOwnerCompanyId(event.target.value)} required>
                  <option value="">Select company (required)</option>
                  {companies.data?.map((item) => (
                    <option key={item.company_id} value={item.company_id}>
                      {item.name || item.company_id}
                    </option>
                  ))}
                </select>
                <button className="context-action" disabled={!canAssign} onClick={() => assignOwner.mutate()}>
                  Assign owner
                </button>
              </div>
            </section>
          </>
        )}

        {ownerNextSteps && (
          <section className="access-invite-card provisioning-next-steps" data-testid="provisioning-owner-next-steps" role="status">
            <strong>Tenant owner assigned</strong>
            <p>
              Invite created for <strong>{ownerNextSteps.email}</strong> on{" "}
              <strong>{ownerNextSteps.companyName}</strong> ({ownerNextSteps.tenantName}). Status stays <em>invited</em> until signup.
            </p>
            <ol className="provisioning-steps">
              <li>
                Owner opens <strong>Create account</strong> and signs up with this exact email ({ownerNextSteps.email}).
              </li>
              <li>Owner signs in. Signup activates the invite — the company then appears in their Company scope switcher.</li>
              <li>Owner selects <strong>{ownerNextSteps.companyName}</strong> to set active workspace scope.</li>
            </ol>
            <p className="provisioning-platform-note">
              Your platform admin session stays unscoped. This company will not appear in your switcher — that is expected.
            </p>
            <div className="provisioning-next-actions">
              <SoftNavLink href="/signup" className="context-action">
                Open signup page
              </SoftNavLink>
            </div>
          </section>
        )}

        {notice && !ownerNextSteps && (
          <p role="status" data-testid="provisioning-notice">
            {notice}
          </p>
        )}
      </div>
    </PermissionGate>
  );
}
