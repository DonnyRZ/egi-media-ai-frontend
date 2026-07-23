"use client";

import { isAxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";

import { Link } from "@/i18n/navigation";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { mapCompanyContext } from "@/shared/api-mappers";
import { useSessionStore } from "@/shared/session-store";
import type { ApiSuccessResponse, CompanyContextDto } from "@/shared/types/api.types";

async function fetchCompanyContext(companyId: string) {
  const response = await axiosClient.get<ApiSuccessResponse<CompanyContextDto>>(API_ENDPOINTS.companyContext(companyId));
  return mapCompanyContext(response.data.data);
}

function getApiError(error: unknown) {
  if (isAxiosError<{ error?: { code?: string; message?: string } }>(error)) {
    return { code: error.response?.data?.error?.code ?? "NETWORK_ERROR", message: error.response?.data?.error?.message ?? "The workspace could not be reached." };
  }
  return { code: "UNKNOWN_ERROR", message: "The workspace could not be loaded." };
}

export function CompanyContextRead() {
  const companyId = useSessionStore((state) => state.activeCompanyId);
  const query = useQuery({
    queryKey: ["company-context", companyId],
    queryFn: () => fetchCompanyContext(companyId as string),
    enabled: Boolean(companyId),
    staleTime: 60_000,
    retry: (failureCount, error) => {
      const code = getApiError(error).code;
      return failureCount < 1 && ["NETWORK_ERROR", "DATABASE_UNAVAILABLE"].includes(code);
    },
  });

  if (!companyId) return <ContextState title="Company scope unavailable" message="Select an authorized company before viewing its context." />;
  if (query.isLoading) return <ContextLoading />;
  if (query.isError) {
    const error = getApiError(query.error);
    if (error.code === "NOT_FOUND") return <ContextState eyebrow="Not found" title="No effective context yet" message="This company does not have an approved effective context." action="Start context setup" />;
    if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN") return <ContextState eyebrow="Access restricted" title="You cannot view this context" message="Your current session is not authorized for this company scope." />;
    if (error.code === "VERSION_CONFLICT") return <ContextState eyebrow="Stale version" title="This context needs to be refreshed" message="The context version changed while this workspace was open. Reload before continuing." action="Reload context" onAction={() => query.refetch()} />;
    return <ContextState eyebrow="Could not load" title="Company context is temporarily unavailable" message={error.message} action="Try again" onAction={() => query.refetch()} />;
  }
  if (!query.data) return <ContextState title="No context data" message="The backend returned an empty context response." />;

  const context = query.data;
  const companyName = readField(context.fields, ["company_name", "companyName", "name"]) ?? "Company name pending";
  const industry = readField(context.fields, ["industry", "sector"]) ?? "Industry pending";
  const updated = formatDate(context.updatedAt);

  return <div className="context-page"><div className="context-page-heading"><div><div className="eyebrow">Company intelligence</div><h1>Company Context</h1><p>The approved context currently guiding relevance and issue analysis.</p></div><span className="context-status-badge">{context.status}</span></div><section className="context-hero-card"><div className="context-company-mark">{companyName.slice(0, 1).toUpperCase()}</div><div><span className="context-label">Effective company</span><h2>{companyName}</h2><p>{industry}</p></div><div className="context-version"><span>Version</span><strong>v{context.version}</strong></div></section><div className="context-meta-grid"><ContextMeta label="Status" value={context.status} /><ContextMeta label="Company ID" value={context.companyId} mono /><ContextMeta label="Last updated" value={updated} /><ContextMeta label="Updated by" value={context.updatedBy ?? "Not available"} /></div><section className="context-detail-card"><div className="context-section-heading"><div><span className="context-label">Context fields</span><h2>What the system knows</h2></div><span className="context-read-only">Read-only</span></div><div className="context-fields">{Object.entries(context.fields).slice(0, 8).map(([key, value]) => <div className="context-field" key={key}><span>{humanize(key)}</span><strong>{displayValue(value)}</strong></div>)}</div></section></div>;
}

function readField(fields: Record<string, unknown>, keys: string[]) {
  for (const key of keys) if (typeof fields[key] === "string" && fields[key]) return fields[key] as string;
  return null;
}

function displayValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return value ? JSON.stringify(value) : "—";
}

function humanize(value: string) { return value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date); }

function ContextMeta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div className="context-meta"><span>{label}</span><strong className={mono ? "is-mono" : ""}>{value}</strong></div>; }

function ContextLoading() { return <div className="context-page"><div className="context-skeleton-heading" /><div className="context-skeleton-hero" /><div className="context-skeleton-grid"><span /><span /><span /><span /></div><div className="context-skeleton-detail" /></div>; }

function ContextState({ eyebrow = "Company intelligence", title, message, action, onAction }: { eyebrow?: string; title: string; message: string; action?: string; onAction?: () => void }) { return <div className="context-state"><div className="context-state-mark">{eyebrow === "Not found" ? "∅" : "i"}</div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{message}</p>{action && (onAction ? <button className="context-action" onClick={onAction}>{action}</button> : <Link className="context-action" href="/settings/company-context">{action}</Link>)}</div>; }
