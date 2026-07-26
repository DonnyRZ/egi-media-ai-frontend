"use client";

import { isAxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { ScopeRequired } from "@/shared/prerequisite-gate";
import { useSessionStore } from "@/shared/session-store";
import { useUiStore } from "@/shared/ui-store";
import { useWorkspaceScope } from "@/shared/workspace-scope";
import type { ApiSuccessResponse } from "@/shared/types/api.types";

type Period = "24jam" | "7hari" | "30hari";
type SummaryItem = { issueId: string; title: string; oneLiner: string | null; status: "baru" | "berkembang" | "dipantau" | "selesai"; priority: "tinggi" | "sedang" | "rendah"; lastDevelopedAt: string };
type ExecutiveSummaryDto = { period: Period; startAt: string; endAt: string; items: SummaryItem[]; issues: SummaryItem[]; top5_limit: 5 };

async function fetchExecutiveSummary(period: Period) {
  const response = await axiosClient.get<ApiSuccessResponse<ExecutiveSummaryDto>>(API_ENDPOINTS.executiveSummary, { params: { period } });
  return response.data.data;
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
  const [period, setPeriod] = useState<Period>("24jam");
  const query = useQuery({ queryKey: ["executive-summary", companyId, period], queryFn: () => fetchExecutiveSummary(period), enabled: Boolean(companyId), staleTime: 30_000, retry: 1 });

  return <div className="summary-page"><div className="summary-heading"><div><div className="eyebrow">Executive intelligence</div><h1>Executive Summary</h1><p>The five issues that deserve attention in the selected period.</p></div><div className="period-selector" role="group" aria-label="Summary period">{([ ["24jam", "24 hours"], ["7hari", "7 days"], ["30hari", "30 days"] ] as const).map(([value, label]) => <button key={value} className={period === value ? "is-active" : ""} onClick={() => setPeriod(value)}>{label}</button>)}</div></div>{query.isLoading ? <SummaryLoading /> : query.isError ? <SummaryError error={query.error} onRetry={() => query.refetch()} /> : !query.data ? <SummaryEmpty /> : <SummaryContent data={query.data} period={period} />}</div>;
}

function SummaryContent({ data, period }: { data: ExecutiveSummaryDto; period: Period }) {
  const openIssue = useUiStore((state) => state.openIssue);
  return <><div className="summary-meta-row"><span>{periodLabel(period)} · {formatDate(data.startAt)} — {formatDate(data.endAt)}</span><span className="backend-ranking-note"><i /> Ranked by intelligence engine · Top {data.top5_limit}</span></div>{data.items.length === 0 ? <SummaryEmpty /> : <div className="summary-grid">{data.items.map((issue, index) => <article className={`summary-issue-card priority-edge-${issue.priority}`} key={issue.issueId} role="button" tabIndex={0} onClick={() => openIssue(issue.issueId)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openIssue(issue.issueId); } }}><div className="summary-card-top"><div className="summary-rank-lockup"><span className="issue-rank">{String(index + 1).padStart(2, "0")}</span><span className="rank-caption">Signal rank</span></div><div className="summary-badges"><PriorityBadge value={issue.priority} /><StatusBadge value={issue.status} /></div></div><h2>{issue.title}</h2><p>{issue.oneLiner || "No one-liner is available for this issue yet."}</p><footer><time dateTime={issue.lastDevelopedAt}>Updated {formatDate(issue.lastDevelopedAt)}</time><span className="summary-arrow" aria-hidden="true">↗</span></footer></article>)}</div>}</>;
}

function PriorityBadge({ value }: { value: SummaryItem["priority"] }) { return <span className={`priority-badge priority-${value}`}>{value}</span>; }
function StatusBadge({ value }: { value: SummaryItem["status"] }) { return <span className={`status-badge status-${value}`}>{value}</span>; }
function SummaryLoading() { return <><div className="summary-meta-skeleton" /><div className="summary-grid">{[1, 2, 3, 4, 5].map((item) => <div className="summary-skeleton-card" key={item}><span /><span /><span /><span /></div>)}</div></>; }
function SummaryEmpty() { return <div className="summary-empty"><div className="summary-empty-mark">○</div><h2>No active signals in this period</h2><p>The intelligence engine found no eligible issues for the selected company and period.</p></div>; }
function SummaryError({ error, onRetry }: { error: unknown; onRetry: () => void }) { const message = isAxiosError<{ error?: { message?: string } }>(error) ? error.response?.data?.error?.message ?? "The dashboard could not be reached." : "The dashboard could not be loaded."; return <div className="summary-empty summary-error"><div className="summary-empty-mark">!</div><h2>Executive Summary unavailable</h2><p>{message}</p><button className="context-action" onClick={onRetry}>Try again</button></div>; }
function periodLabel(period: Period) { return period === "24jam" ? "Last 24 hours" : period === "7hari" ? "Last 7 days" : "Last 30 days"; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date); }
