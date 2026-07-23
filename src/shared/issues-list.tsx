"use client";

import { isAxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { mapIssueList } from "@/shared/api-mappers";
import { useSessionStore } from "@/shared/session-store";
import { useUiStore } from "@/shared/ui-store";
import type { ApiSuccessResponse, IssueListDto } from "@/shared/types/api.types";
import { buildIssueListParams, type IssuePeriod } from "@/shared/api-query";

type PriorityFilter = "all" | "tinggi" | "sedang" | "rendah";
type StatusFilter = "all" | "baru" | "berkembang" | "dipantau" | "selesai";

async function fetchIssues(companyId: string, params: { q: string; priority: PriorityFilter; status: StatusFilter; period: IssuePeriod; page: number }) {
  const response = await axiosClient.get<ApiSuccessResponse<IssueListDto>>(API_ENDPOINTS.issues, { params: buildIssueListParams({ ...params, limit: 10 }) });
  return mapIssueList(response.data.data);
}

export function IssuesList() {
  const companyId = useSessionStore((state) => state.activeCompanyId);
  const openIssue = useUiStore((state) => state.openIssue);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [period, setPeriod] = useState<IssuePeriod>("all");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["issues", companyId, deferredSearch, priority, status, period, page],
    queryFn: () => fetchIssues(companyId as string, { q: deferredSearch, priority, status, period, page }),
    enabled: Boolean(companyId), placeholderData: (previous) => previous, staleTime: 15_000, retry: 1,
  });
  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.pagination.total / query.data.pagination.limit)) : 1;
  const hasFilters = Boolean(search || priority !== "all" || status !== "all" || period !== "all");
  function resetFilters() { setSearch(""); setPriority("all"); setStatus("all"); setPeriod("all"); setPage(1); }
  function updatePriority(value: PriorityFilter) { setPriority(value); setPage(1); }
  function updateStatus(value: StatusFilter) { setStatus(value); setPage(1); }
  function updatePeriod(value: IssuePeriod) { setPeriod(value); setPage(1); }

  return <div className="issues-page">
    <div className="issues-heading"><div><div className="eyebrow">Issue intelligence</div><h1>All Issues</h1><p>Search the complete company issue set, beyond the Executive Summary Top 5.</p></div><span className="issues-scope-badge">Company scoped</span></div>
    <div className="issues-toolbar">
      <label className="issues-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search title or one-liner..." aria-label="Search issues" /></label>
      <select value={priority} onChange={(event) => updatePriority(event.target.value as PriorityFilter)} aria-label="Filter by priority"><option value="all">All priorities</option><option value="tinggi">High priority</option><option value="sedang">Medium priority</option><option value="rendah">Low priority</option></select>
      <select value={status} onChange={(event) => updateStatus(event.target.value as StatusFilter)} aria-label="Filter by status"><option value="all">All statuses</option><option value="baru">Baru</option><option value="berkembang">Berkembang</option><option value="dipantau">Dipantau</option><option value="selesai">Selesai</option></select>
      <select value={period} onChange={(event) => updatePeriod(event.target.value as IssuePeriod)} aria-label="Filter by period"><option value="all">All periods</option><option value="24jam">Last 24 hours</option><option value="7hari">Last 7 days</option><option value="30hari">Last 30 days</option></select>
    </div>
    <div className="issues-filter-note"><span>{hasFilters ? "Filtered issue set" : "Complete issue set"}</span><span>{period === "all" ? "All development periods" : `Updated in ${period}`}</span></div>
    {query.isLoading ? <IssuesLoading /> : query.isError ? <IssuesError error={query.error} onRetry={() => query.refetch()} /> : !query.data || query.data.items.length === 0 ? <IssuesEmpty filtered={hasFilters} onReset={resetFilters} /> : <><div className="issues-list">{query.data.items.map((issue) => <article className="issue-list-card" key={issue.id} role="button" tabIndex={0} onClick={() => openIssue(issue.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openIssue(issue.id); } }}><div className="issue-list-rank"><span>Issue</span><strong>{issue.id.slice(0, 8)}</strong></div><div className="issue-list-copy"><h2>{issue.title}</h2><p>{issue.oneLiner || "No one-liner is available for this issue yet."}</p><div className="issue-list-meta"><PriorityBadge value={issue.priority} /><StatusBadge value={issue.status} /><span>Updated {formatDate(issue.lastDevelopedAt)}</span></div></div><span className="issue-list-arrow" aria-hidden="true">↗</span></article>)}</div><Pagination page={page} totalPages={totalPages} onPage={setPage} total={query.data.pagination.total} /></>}
  </div>;
}

function PriorityBadge({ value }: { value: "tinggi" | "sedang" | "rendah" | null }) { return <span className={`priority-badge priority-${value ?? "rendah"}`}>{value ?? "unprioritized"}</span>; }
function StatusBadge({ value }: { value: "baru" | "berkembang" | "dipantau" | "selesai" }) { return <span className={`status-badge status-${value}`}>{value}</span>; }
function Pagination({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (page: number) => void }) { return <div className="issues-pagination"><span>{total} issues · Page {page} of {totalPages}</span><div><button disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">←</button><button disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">→</button></div></div>; }
function IssuesLoading() { return <div className="issues-list">{[1, 2, 3, 4].map((item) => <div className="issue-list-skeleton" key={item}><span /><span /><span /><span /></div>)}</div>; }
function IssuesEmpty({ filtered, onReset }: { filtered: boolean; onReset: () => void }) { return <div className="issues-empty"><div className="summary-empty-mark">◁</div><h2>{filtered ? "No issues match these filters" : "No issues yet"}</h2><p>{filtered ? "Try a broader search or remove one of the filters." : "There are no issue records available for this company scope."}</p>{filtered && <button className="context-action" onClick={onReset}>Clear filters</button>}</div>; }
function IssuesError({ error, onRetry }: { error: unknown; onRetry: () => void }) { const message = isAxiosError<{ error?: { message?: string } }>(error) ? error.response?.data?.error?.message ?? "The issue list could not be reached." : "The issue list could not be loaded."; return <div className="issues-empty"><div className="summary-empty-mark">!</div><h2>Issues unavailable</h2><p>{message}</p><button className="context-action" onClick={onRetry}>Try again</button></div>; }
function formatDate(value: string | null) { if (!value) return "No update time"; const date = new Date(value); return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date); }
