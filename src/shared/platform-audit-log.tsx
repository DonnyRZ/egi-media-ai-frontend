"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, FileClock, RefreshCw } from "lucide-react";
import { isAxiosError } from "axios";

import { AppSelect } from "@/shared/app-select";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import type { ApiSuccessResponse } from "@/shared/types/api.types";

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
  return <AuditLog endpoint={API_ENDPOINTS.platformAuditEvents} eyebrow="Platform operations" description="Review access decisions and platform actions with their scope and outcome." tableLabel="Platform audit events" emptyMessage="Platform access decisions will appear here as the control plane is used." />;
}

export function TenantAuditLog() {
  return <AuditLog endpoint={API_ENDPOINTS.tenantAuditEvents} eyebrow="Workspace administration" description="Review access decisions and workspace actions for this tenant." tableLabel="Tenant audit events" emptyMessage="Access decisions will appear here as this workspace is used." />;
}

function AuditLog({ endpoint, eyebrow, description, tableLabel, emptyMessage }: { endpoint: string; eyebrow: string; description: string; tableLabel: string; emptyMessage: string }) {
  const [action, setAction] = useState("");
  const [outcome, setOutcome] = useState("");
  const query = useQuery({ queryKey: [endpoint, action, outcome], queryFn: () => readAudit(endpoint, action, outcome), staleTime: 15_000, retry: 1 });

  return (
    <div className="platform-ops-page">
      <header className="platform-ops-header">
        <div><p className="platform-eyebrow">{eyebrow}</p><h1>Audit log</h1><p>{description}</p></div>
        <FileClock size={28} strokeWidth={1.6} aria-hidden="true" className="platform-ops-header-icon" />
      </header>

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
        <button className="platform-secondary-button" onClick={() => void query.refetch()}><RefreshCw size={15} aria-hidden="true" /> Refresh</button>
      </section>

      {query.isLoading ? <AuditState eyebrow={eyebrow} title="Loading audit events" message="Reading the latest workspace activity." /> : query.isError ? <AuditState eyebrow={eyebrow} title="Audit log unavailable" message={isAxiosError<{ error?: { message?: string } }>(query.error) ? query.error.response?.data?.error?.message || "The audit service could not be reached." : "The audit service could not be reached."} onRetry={() => void query.refetch()} /> : query.data?.items.length ? <AuditTable items={query.data.items} tableLabel={tableLabel} /> : <div className="platform-ops-empty"><FileClock size={22} aria-hidden="true" /><h2>No audit events</h2><p>{emptyMessage}</p></div>}
    </div>
  );
}

function AuditTable({ items, tableLabel }: { items: AuditEvent[]; tableLabel: string }) {
  return <section className="platform-audit-table-wrap" aria-label={tableLabel}><table className="platform-audit-table"><thead><tr><th scope="col">Time</th><th scope="col">Action</th><th scope="col">Actor</th><th scope="col">Scope</th><th scope="col">Outcome</th></tr></thead><tbody>{items.map((item) => <tr key={item.event_id}><td><time dateTime={item.created_at}>{formatDate(item.created_at)}</time></td><td><strong>{label(item.action)}</strong><small>{item.request_id ? `Request ${item.request_id.slice(0, 12)}` : "No request id"}</small></td><td><strong>{item.actor_id || "System"}</strong><small>{label(item.actor_type)}</small></td><td><strong>{item.company_id || item.tenant_id || "Platform"}</strong><small>{item.company_id ? "Company" : item.tenant_id ? "Tenant" : "Unscoped"}</small></td><td><span className={`platform-audit-outcome is-${item.outcome}`}>{label(item.outcome)}</span></td></tr>)}</tbody></table></section>;
}

function AuditState({ eyebrow, title, message, onRetry }: { eyebrow: string; title: string; message: string; onRetry?: () => void }) {
  return <div className="platform-ops-state"><div className="platform-ops-state-icon"><CircleAlert size={20} aria-hidden="true" /></div><p className="platform-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{message}</p>{onRetry && <button className="platform-primary-button" onClick={onRetry}>Try again</button>}</div>;
}
