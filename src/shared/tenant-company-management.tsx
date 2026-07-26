"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "@/shared/lib/axios-client";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { PermissionGate } from "@/shared/permission-guard";
import { PrerequisiteGate } from "@/shared/prerequisite-gate";
import { useWorkspaceScope } from "@/shared/workspace-scope";

const idempotency = () => crypto.randomUUID();

export function TenantCompanyManagement() {
  const { hasTenant } = useWorkspaceScope();
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const companies = useQuery({
    queryKey: ["authorized-companies"],
    queryFn: async () =>
      (await axiosClient.get<{ data: { items: Array<{ company_id: string; name: string | null; status?: string }> } }>(API_ENDPOINTS.companies))
        .data.data.items,
    enabled: hasTenant,
  });
  const create = useMutation({
    mutationFn: async () =>
      (await axiosClient.post(API_ENDPOINTS.tenantCompanies, { name, status: "active" }, { headers: { "Idempotency-Key": idempotency() } })).data,
    onSuccess: () => {
      setName("");
      setNotice("Company created. Prepare and approve its Company Context before ingest.");
      client.invalidateQueries({ queryKey: ["authorized-companies"] });
    },
    onError: () => {
      setNotice("Company could not be created. Check the name and tenant scope, then try again.");
    },
  });

  // Sprint 0 foundation smoke: gate before admin chrome when session has no tenant.
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
      <div className="settings-hub">
        <div className="page-context">
          <span className="supporting-text">Create and manage companies inside the current customer tenant. Company data never crosses tenant boundaries.</span>
        </div>
        <section className="access-invite-card">
          <strong>Create company</strong>
          <div className="access-form">
            <input aria-label="Company name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Company name" />
            <button className="context-action" disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
              Create company
            </button>
          </div>
        </section>
        <section className="access-list-card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Authorized companies</div>
              <h2>Company scope</h2>
            </div>
          </div>
          {companies.isLoading && <p>Loading companies...</p>}
          {companies.error && <p role="alert">Companies are unavailable.</p>}
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
        {notice && (
          <p role={create.isError ? "alert" : "status"} data-testid="company-create-notice">
            {notice}
          </p>
        )}
      </div>
    </PermissionGate>
  );
}
