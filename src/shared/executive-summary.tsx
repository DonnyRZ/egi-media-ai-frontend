"use client";

import { isAxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertCircle, Inbox } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { ScopeRequired } from "@/shared/prerequisite-gate";
import { useSessionStore } from "@/shared/session-store";
import { useUiStore } from "@/shared/ui-store";
import { useWorkspaceScope } from "@/shared/workspace-scope";
import type { ApiSuccessResponse } from "@/shared/types/api.types";

type Period = "24jam" | "7hari" | "30hari";
type SummaryItem = { issueId: string; title: string; oneLiner: string | null; status: "baru" | "berkembang" | "dipantau" | "selesai"; priority: "tinggi" | "sedang" | "rendah"; lastDevelopedAt: string };
type ExecutiveSummaryDto = { period: Period; startAt: string; endAt: string; items: SummaryItem[]; issues: SummaryItem[]; top5_limit: 20 };

async function fetchExecutiveSummary(period: Period) {
  const response = await axiosClient.get<ApiSuccessResponse<ExecutiveSummaryDto>>(API_ENDPOINTS.executiveSummary, { params: { period } });
  return response.data.data;
}

async function fetchContextReadiness(companyId: string) {
  try {
    await axiosClient.get(API_ENDPOINTS.companyContext(companyId));
    return { hasEffectiveContext: true };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return { hasEffectiveContext: false };
    // This auxiliary read must never hide a usable dashboard for a role that
    // cannot read context or when the context service is temporarily down.
    return { hasEffectiveContext: true };
  }
}

export function ExecutiveSummary() {
  const scope = useWorkspaceScope();

  return (
    <ScopeRequired
      require="company"
      scope={scope}
      title="Company scope required for Executive Summary"
      reason="Executive Summary is company-scoped. Without an active company, there is no signal set to rank — this is not an empty period."
      nextStep="Pick a company in the header switcher. If none exist, provision one under Platform, then return here."
    >
      <ExecutiveSummaryBody />
    </ScopeRequired>
  );
}

function ExecutiveSummaryBody() {
  const companyId = useSessionStore((state) => state.activeCompanyId);
  const canReadContext = useSessionStore((state) => state.permissions.includes("company_context.read"));
  const [period, setPeriod] = useState<Period>("24jam");
  const query = useQuery({ queryKey: ["executive-summary", companyId, period], queryFn: () => fetchExecutiveSummary(period), enabled: Boolean(companyId), staleTime: 30_000, retry: 1 });
  const contextQuery = useQuery({ queryKey: ["company-context-readiness", companyId], queryFn: () => fetchContextReadiness(companyId as string), enabled: Boolean(companyId && canReadContext), staleTime: 30_000, retry: false });

  const contextMissing = canReadContext && contextQuery.data?.hasEffectiveContext === false;
  return <div className="summary-page"><div className="page-context"><span className="supporting-text">The issues that deserve executive attention in the selected period.</span><div className="period-selector" role="group" aria-label="Summary period">{([ ["24jam", "24 hours"], ["7hari", "7 days"], ["30hari", "30 days"] ] as const).map(([value, label]) => <button key={value} className={period === value ? "is-active" : ""} onClick={() => setPeriod(value)}>{label}</button>)}</div></div>{query.isLoading ? <SummaryLoading /> : query.isError ? <SummaryError error={query.error} onRetry={() => query.refetch()} /> : !query.data ? <SummaryEmpty contextMissing={contextMissing} /> : contextMissing && query.data.items.length === 0 ? <SummaryEmpty contextMissing /> : <SummaryContent data={query.data} period={period} />}</div>;
}

function SummaryContent({ data, period }: { data: ExecutiveSummaryDto; period: Period }) {
  const openIssue = useUiStore((state) => state.openIssue);
  return <><div className="summary-meta-row"><span>{periodLabel(period)} · {formatDate(data.startAt)} — {formatDate(data.endAt)}</span><span className="backend-ranking-note"><i /> Ranked by intelligence engine · Top {data.top5_limit}</span></div>{data.items.length === 0 ? <SummaryEmpty /> : <div className="summary-grid">{data.items.map((issue, index) => <article className="summary-issue-card" key={issue.issueId} role="button" tabIndex={0} onClick={() => openIssue(issue.issueId)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openIssue(issue.issueId); } }}><span className="issue-rank" aria-hidden="true">{index + 1}</span><div className="summary-issue-body"><h2>{issue.title}</h2><p>{issue.oneLiner || "No one-liner is available for this issue yet."}</p><footer><time dateTime={issue.lastDevelopedAt}>Updated {formatDate(issue.lastDevelopedAt)}</time></footer></div><div className="summary-issue-side"><div className="badge-row"><PriorityBadge value={issue.priority} /><StatusBadge value={issue.status} /></div></div></article>)}</div>}</>;
}

function PriorityBadge({ value }: { value: SummaryItem["priority"] }) { return <span className={`meta-tag meta-priority meta-priority-${value}`}>{value}</span>; }
function StatusBadge({ value }: { value: SummaryItem["status"] }) { return <span className={`meta-tag meta-status meta-status-${value}`}>{value}</span>; }
function SummaryLoading() { return <><div className="summary-meta-skeleton" /><div className="summary-grid">{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <div className="summary-skeleton-card" key={item}><span /><span /><span /><span /></div>)}</div></>; }
function SummaryEmpty({ contextMissing = false }: { contextMissing?: boolean }) { return <div className="summary-empty">{contextMissing ? <><div className="summary-empty-mark"><Inbox size={20} strokeWidth={2} aria-hidden="true" /></div><h2>Set up Company Context to start intelligence</h2><p>This company has no approved context yet, so the engine cannot rank leadership-relevant signals.</p><Link className="context-action" href="/settings/company-context/versions">Open Company Context</Link></> : <><div className="summary-empty-mark"><Inbox size={20} strokeWidth={2} aria-hidden="true" /></div><h2>No active signals in this period</h2><p>The intelligence engine found no eligible issues for the selected company and period.</p></>}</div>; }
function SummaryError({ error, onRetry }: { error: unknown; onRetry: () => void }) { const message = isAxiosError<{ error?: { message?: string } }>(error) ? error.response?.data?.error?.message ?? "The dashboard could not be reached." : "The dashboard could not be loaded."; return <div className="summary-empty summary-error"><div className="summary-empty-mark"><AlertCircle size={20} strokeWidth={2} aria-hidden="true" /></div><h2>Executive Summary unavailable</h2><p>{message}</p><button className="context-action" onClick={onRetry}>Try again</button></div>; }
function periodLabel(period: Period) { return period === "24jam" ? "Last 24 hours" : period === "7hari" ? "Last 7 days" : "Last 30 days"; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date); }
