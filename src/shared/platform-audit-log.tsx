"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, FileClock, LoaderCircle, RefreshCw } from "lucide-react";
import { isAxiosError } from "axios";

import { AppSelect } from "@/shared/app-select";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { PermissionGate } from "@/shared/permission-guard";
import { ScopeRequired } from "@/shared/prerequisite-gate";
import { useSessionStore } from "@/shared/session-store";
import type { ApiSuccessResponse } from "@/shared/types/api.types";
import { useWorkspaceScope } from "@/shared/workspace-scope";
import { BusyLabel } from "@/shared/ux-state";

type AuditEvent = { event_id: string; actor_id: string | null; actor_type: string; tenant_id: string | null; company_id: string | null; action: string; outcome: "allowed" | "denied"; request_id: string | null; created_at: string };
type AuditPayload = { items: AuditEvent[]; meta: { limit: number; total: number } };

async function readAudit(endpoint: string, action: string, outcome: string) {
  const params = new URLSearchParams({ limit: "100" });
  if (action) params.set("action", action);
  if (outcome) params.set("outcome", outcome);
  const response = await axiosClient.get<ApiSuccessResponse<AuditPayload>>(`${endpoint}?${params.toString()}`);
  return response.data.data;
}

function label(value: string | null) {
  return (value || "—").replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function PlatformAuditLog() {
  return (
    <PermissionGate
      permission="platform.tenants.manage"
      fallback={<div className="standard-state standard-state-forbidden"><h2>Platform audit restricted</h2><p>Platform audit events are available only to platform administrators.</p></div>}
    >
      <AuditLog endpoint={API_ENDPOINTS.platformAuditEvents} eyebrow="Platform operations" tableLabel="Platform audit events" emptyMessage="Platform access decisions will appear here as the control plane is used." />
    </PermissionGate>
  );
}

export function TenantAuditLog() {
  const scope = useWorkspaceScope();
  const canRead = useSessionStore((state) => state.permissions.includes("audit.read"));
  return (
    <ScopeRequired
      require="tenant"
      scope={scope}
      title="Tenant required for audit log"
      reason="Workspace audit events belong to one customer tenant. Select a tenant scope before opening this log."
      nextStep="Ask a tenant owner or platform administrator to grant this account workspace access."
    >
      {canRead ? (
        <AuditLog endpoint={API_ENDPOINTS.tenantAuditEvents} eyebrow="Workspace administration" tableLabel="Tenant audit events" emptyMessage="Access decisions will appear here as this workspace is used." />
      ) : (
        <div className="standard-state standard-state-forbidden"><h2>Audit log restricted</h2><p>Your role cannot review workspace audit events.</p></div>
      )}
    </ScopeRequired>
  );
}

function AuditLog({ endpoint, eyebrow, tableLabel, emptyMessage }: { endpoint: string; eyebrow: string; tableLabel: string; emptyMessage: string }) {
  const [action, setAction] = useState("");
  const [outcome, setOutcome] = useState("");
  const query = useQuery({ queryKey: [endpoint, action, outcome], queryFn: () => readAudit(endpoint, action, outcome), staleTime: 15_000, retry: 1 });

  return (
    <div className="platform-ops-page">
      <section className="platform-ops-toolbar" aria-label="Audit filters">
        <label><span>Action</span><input value={action} onChange={(event) => setAction(event.target.value)} placeholder="Filter by action" /></label>
        <label>
          <span>Outcome</span>
          <AppSelect
            aria-label="Outcome"
            value={outcome}
            options={[
              { value: "", label: "All outcomes" },
              { value: "allowed", label: "Allowed" },
              { value: "denied", label: "Denied" },
            ]}
            onChange={setOutcome}
          />
        </label>
        <button className="platform-secondary-button" aria-busy={query.isFetching} disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? <LoaderCircle className="button-spinner" size={15} aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />} {query.isFetching ? "Refreshing..." : "Refresh"}</button>
      </section>

      {query.isLoading ? <AuditState eyebrow={eyebrow} title="Loading audit events" message="Reading the latest workspace activity." loading /> : query.isError ? <AuditState eyebrow={eyebrow} title="Audit log unavailable" message={isAxiosError<{ error?: { message?: string } }>(query.error) ? query.error.response?.data?.error?.message || "The audit service could not be reached." : "The audit service could not be reached."} onRetry={() => void query.refetch()} /> : query.data?.items.length ? <AuditTable items={query.data.items} tableLabel={tableLabel} /> : <div className="platform-ops-empty"><FileClock size={22} aria-hidden="true" /><h2>No audit events</h2><p>{emptyMessage}</p></div>}
    </div>
  );
}

function AuditTable({ items, tableLabel }: { items: AuditEvent[]; tableLabel: string }) {
  return <section className="platform-audit-table-wrap" aria-label={tableLabel}><table className="platform-audit-table"><thead><tr><th scope="col">Time</th><th scope="col">Action</th><th scope="col">Actor</th><th scope="col">Scope</th><th scope="col">Outcome</th></tr></thead><tbody>{items.map((item) => <tr key={item.event_id}><td><time dateTime={item.created_at}>{formatDate(item.created_at)}</time></td><td><strong>{label(item.action)}</strong><small>{item.request_id ? `Request ${item.request_id.slice(0, 12)}` : "No request id"}</small></td><td><strong>{item.actor_id || "System"}</strong><small>{label(item.actor_type)}</small></td><td><strong>{item.company_id || item.tenant_id || "Platform"}</strong><small>{item.company_id ? "Company" : item.tenant_id ? "Tenant" : "Unscoped"}</small></td><td><span className={`platform-audit-outcome is-${item.outcome}`}>{label(item.outcome)}</span></td></tr>)}</tbody></table></section>;
}

function AuditState({ eyebrow, title, message, onRetry, loading = false }: { eyebrow: string; title: string; message: string; onRetry?: () => void | Promise<unknown>; loading?: boolean }) {
  const [retrying, setRetrying] = useState(false);
  async function retry() {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }
  return <div className="platform-ops-state" aria-busy={loading || retrying}><div className="platform-ops-state-icon">{loading || retrying ? <LoaderCircle className="platform-loading-icon" size={20} aria-hidden="true" /> : <CircleAlert size={20} aria-hidden="true" />}</div><p className="platform-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{message}</p>{onRetry && <button className="platform-primary-button" aria-busy={retrying} data-loading={retrying} disabled={retrying} onClick={() => void retry()}>{retrying ? <BusyLabel>Retrying…</BusyLabel> : "Try again"}</button>}</div>;
}
