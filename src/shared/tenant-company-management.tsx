"use client";

import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppSelect } from "@/shared/app-select";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { PermissionGate } from "@/shared/permission-guard";
import { PrerequisiteGate } from "@/shared/prerequisite-gate";
import { useSessionStore } from "@/shared/session-store";
import { useWorkspaceScope } from "@/shared/workspace-scope";
import { displayCompanyName } from "@/shared/company-options";
import type { ApiSuccessResponse } from "@/shared/types/api.types";
import { BusyLabel, CollectionLoading, CollectionPagination } from "@/shared/ux-state";

type CompanyStatus = "pending" | "active" | "suspended" | "archived" | string;
type CompanyRow = { company_id: string; name: string | null; status?: CompanyStatus; tenant_id?: string };

const statusLabels: Record<string, string> = {
  pending: "Pending setup",
  active: "Active",
  suspended: "Suspended",
  archived: "Archived",
};

const idempotency = (action: string) => `tenant-company-${action}-${crypto.randomUUID()}`;
const COMPANY_PAGE_SIZE = 20;

function statusLabel(status: CompanyStatus) {
  return statusLabels[status] ?? status.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function apiMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ error?: { message?: string } }>(error)) return error.response?.data?.error?.message ?? fallback;
  return error instanceof Error ? error.message : fallback;
}

export function TenantCompanyManagement() {
  const { hasTenant } = useWorkspaceScope();
  const canManageCompanies = useSessionStore((state) => state.permissions.includes("tenant.companies.manage"));
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingStatus, setEditingStatus] = useState<CompanyStatus>("active");
  const [page, setPage] = useState(1);

  const companies = useQuery({
    // Tenant administration needs the tenant registry, not the company-scoped
    // switcher feed. The latter is membership-derived and can omit a company
    // immediately after creation.
    queryKey: ["tenant-companies", page],
    queryFn: async () => {
      const result = (await axiosClient.get<{ data: { items: CompanyRow[]; meta?: { page: number; limit: number; total: number } } }>(API_ENDPOINTS.tenantCompanies, { params: { page, limit: COMPANY_PAGE_SIZE } })).data.data;
      return { items: result.items, meta: result.meta ?? { page, limit: COMPANY_PAGE_SIZE, total: result.items.length } };
    },
    enabled: hasTenant && canManageCompanies,
    retry: false,
  });
  const companyRows = useMemo(() => {
    const byId = new Map<string, CompanyRow>();
    for (const company of companies.data?.items ?? []) {
      if (!company.company_id) continue;
      const current = byId.get(company.company_id);
      byId.set(company.company_id, { ...current, ...company, name: company.name ?? current?.name ?? null });
    }
    return [...byId.values()];
  }, [companies.data?.items]);
  const registryUnavailable = companies.isError;

  const create = useMutation({
    mutationFn: async () =>
      axiosClient.post<ApiSuccessResponse<{ company: CompanyRow }>>(
        API_ENDPOINTS.tenantCompanies,
        { name: name.trim(), status: "active" },
        { headers: { "Idempotency-Key": idempotency("create") } },
      ),
    onSuccess: () => {
      setName("");
      setNotice({ kind: "success", text: "Company created. Assign access, then approve its Company Context before ingest." });
      setPage(1);
      void client.invalidateQueries({ queryKey: ["tenant-companies"] });
    },
    onError: (error) => setNotice({ kind: "error", text: apiMessage(error, "Company could not be created.") }),
  });

  const update = useMutation({
    mutationFn: async (input: { companyId: string; name: string; status: CompanyStatus }) =>
      axiosClient.patch<ApiSuccessResponse<{ company: CompanyRow }>>(
        API_ENDPOINTS.tenantCompany(input.companyId),
        { name: input.name.trim(), status: input.status },
        { headers: { "Idempotency-Key": idempotency("update") } },
      ),
    onSuccess: (response) => {
      const updated = response.data.data.company;
      setEditingId(null);
      setNotice({ kind: "success", text: "Company details updated." });
      client.setQueryData<{ items: CompanyRow[]; meta: { page: number; limit: number; total: number } }>(["tenant-companies", page], (current) => current ? {
        ...current,
        items: current.items.map((item) => item.company_id === updated.company_id ? { ...item, ...updated } : item),
      } : current,
      );
    },
    onError: (error) => setNotice({ kind: "error", text: apiMessage(error, "Company could not be updated.") }),
  });

  function beginEdit(company: CompanyRow) {
    setNotice(null);
    setEditingId(company.company_id);
    setEditingName(company.name ?? "");
    setEditingStatus(company.status ?? "active");
  }

  if (!hasTenant) {
    return (
      <PrerequisiteGate
        missing="tenant"
        title="Tenant required for companies"
        reason="Company administration is scoped to a customer tenant. Your session has no tenant assigned yet."
        nextStep="Open Platform provisioning to create a tenant and company, then return to Companies."
      />
    );
  }

  return (
    <PermissionGate
      permission="tenant.companies.manage"
      fallback={
        <div className="standard-state standard-state-forbidden">
          <h2>Company administration restricted</h2>
          <p>Only tenant owners and tenant administrators can manage companies.</p>
        </div>
      }
    >
      <div className="company-admin-page">
        <div className="company-admin-heading">
          <span className="eyebrow">Workspace administration</span>
          <span className="company-admin-count">
            {companies.isPending ? "Loading..." : registryUnavailable ? "Registry unavailable" : `${companies.data?.meta.total ?? companyRows.length} ${companies.data?.meta.total === 1 ? "company" : "companies"}`}
          </span>
        </div>

        <section className="company-create-panel" aria-labelledby="create-company-heading">
          <div className="company-section-heading">
            <div>
              <span className="context-label">Company registry</span>
              <h2 id="create-company-heading">Add a company</h2>
            </div>
            {registryUnavailable && <span className="company-section-note">Registry unavailable</span>}
          </div>
          <form className="company-create-form" onSubmit={(event) => { event.preventDefault(); if (name.trim()) create.mutate(); }}>
            <label>
              <span>Company name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Northstar Analytics" disabled={registryUnavailable} />
            </label>
            <button className="context-action" type="submit" disabled={!name.trim() || create.isPending || registryUnavailable} aria-busy={create.isPending} data-loading={create.isPending}>
              {create.isPending ? "Creating…" : "Create company"}
            </button>
          </form>
        </section>

        {notice && <div className={`company-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>{notice.text}</div>}

        <section className="company-list-panel" aria-labelledby="company-list-heading">
          <div className="company-section-heading">
            <div>
              <span className="context-label">Workspace companies</span>
              <h2 id="company-list-heading">Company registry</h2>
            </div>
            {!companies.isLoading && !companies.error && companies.data && <span className="company-section-note">Showing {companyRows.length ? (page - 1) * (companies.data.meta.limit || COMPANY_PAGE_SIZE) + 1 : 0}-{Math.min(page * (companies.data.meta.limit || COMPANY_PAGE_SIZE), companies.data.meta.total)} of {companies.data.meta.total}</span>}
          </div>
          {companies.isLoading && <CollectionLoading label="Loading companies..." rows={3} className="company-list-loading" />}
          {companies.error && (
            <div className="company-list-state company-list-state-error" role="alert">
              <strong>Company registry unavailable</strong>
              <span>Try again when the workspace registry is available.</span>
              <button className="source-preview-button" type="button" aria-busy={companies.isFetching} data-loading={companies.isFetching} disabled={companies.isFetching} onClick={() => void companies.refetch()}>{companies.isFetching ? <BusyLabel>Retrying…</BusyLabel> : "Retry"}</button>
            </div>
          )}
          {!companies.isLoading && !companies.error && !companyRows.length && <p className="company-list-state">No companies have been added yet.</p>}
          <div className="company-row-list">
            {companyRows.map((company) => (
              <div className="company-admin-row" key={company.company_id}>
                <div className="company-admin-row-main">
                  <div className="company-admin-row-title">
                    <strong>{displayCompanyName(company)}</strong>
                    <span className={`company-status company-status-${company.status ?? "active"}`}>{statusLabel(company.status ?? "active")}</span>
                  </div>
                </div>
                <button className="source-preview-button" type="button" onClick={() => beginEdit(company)}>Edit</button>
                {editingId === company.company_id && (
                  <div className="company-edit-panel">
                    <label>
                      <span>Company name</span>
                      <input value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                    </label>
                    <label>
                      <span>Status</span>
                      <AppSelect
                        aria-label="Status"
                        value={editingStatus}
                        options={[
                          { value: "pending", label: "Pending setup" },
                          { value: "active", label: "Active" },
                          { value: "suspended", label: "Suspended" },
                          { value: "archived", label: "Archived" },
                        ]}
                        onChange={setEditingStatus}
                      />
                    </label>
                    <div className="company-edit-actions">
                      <button className="context-action" type="button" disabled={!editingName.trim() || update.isPending} aria-busy={update.isPending} data-loading={update.isPending} onClick={() => update.mutate({ companyId: company.company_id, name: editingName, status: editingStatus })}>
                        {update.isPending ? "Saving…" : "Save changes"}
                      </button>
                      <button className="context-action context-action-secondary" type="button" disabled={update.isPending} onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {companies.data && <CollectionPagination page={page} total={companies.data.meta.total} limit={companies.data.meta.limit || COMPANY_PAGE_SIZE} onPageChange={setPage} isFetching={companies.isFetching} label="companies" />}
        </section>
      </div>
    </PermissionGate>
  );
}
