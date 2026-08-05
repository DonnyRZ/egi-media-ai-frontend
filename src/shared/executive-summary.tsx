"use client";

import { isAxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertCircle, ArrowRight, Inbox } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { ScopeRequired } from "@/shared/prerequisite-gate";
import { useSessionStore } from "@/shared/session-store";
import { useUiStore } from "@/shared/ui-store";
import { useWorkspaceScope } from "@/shared/workspace-scope";
import { priorityLabel, statusLabel } from "@/shared/intelligence-labels";
import type { ApiSuccessResponse } from "@/shared/types/api.types";
import { BusyLabel } from "@/shared/ux-state";

type Period = "24jam" | "7hari" | "30hari";
type SummaryItem = {
  issueId: string;
  title: string;
  oneLiner: string | null;
  status: "baru" | "berkembang" | "dipantau" | "selesai";
  priority: "tinggi" | "sedang" | "rendah" | null;
  lastDevelopedAt: string;
};
type ExecutiveSummaryDto = {
  period: Period;
  startAt: string;
  endAt: string;
  items: SummaryItem[];
  issues: SummaryItem[];
  top5_limit: number;
};

const PERIOD_OPTIONS = [
  { value: "24jam", label: "24 hours", summaryLabel: "Last 24 hours" },
  { value: "7hari", label: "7 days", summaryLabel: "Last 7 days" },
  { value: "30hari", label: "30 days", summaryLabel: "Last 30 days" },
] as const satisfies readonly { value: Period; label: string; summaryLabel: string }[];

async function fetchExecutiveSummary(period: Period) {
  const response = await axiosClient.get<ApiSuccessResponse<ExecutiveSummaryDto>>(
    API_ENDPOINTS.executiveSummary,
    { params: { period } },
  );
  return response.data.data;
}

async function fetchContextReadiness(companyId: string) {
  try {
    await axiosClient.get(API_ENDPOINTS.companyContext(companyId));
    return { hasEffectiveContext: true };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return { hasEffectiveContext: false };

    // A failed auxiliary read is not evidence that the company has no
    // effective context. Let the query expose the unknown state instead of
    // presenting an empty dashboard as a trustworthy result.
    throw error;
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
  const query = useQuery({
    queryKey: ["executive-summary", companyId, period],
    queryFn: () => fetchExecutiveSummary(period),
    enabled: Boolean(companyId),
    staleTime: 30_000,
    retry: 1,
  });
  const contextQuery = useQuery({
    queryKey: ["company-context-readiness", companyId],
    queryFn: () => fetchContextReadiness(companyId as string),
    enabled: Boolean(companyId && canReadContext),
    staleTime: 30_000,
    retry: false,
  });

  const contextMissing = canReadContext && contextQuery.data?.hasEffectiveContext === false;
  const contextChecking = canReadContext && contextQuery.isPending;
  const contextUnavailable = canReadContext && contextQuery.isError;

  return (
    <div className="summary-page">
      <div className="page-context summary-page-context">
        <div className="summary-page-context-copy">
          <PeriodTabs period={period} onChange={setPeriod} />
          <span className="supporting-text">The 3–5 issues that deserve executive attention in this period.</span>
          {query.isFetching && !query.isLoading && <span className="period-refresh-status" role="status" aria-busy="true"><BusyLabel>Updating...</BusyLabel></span>}
        </div>
      </div>
      {query.isLoading ? <SummaryLoading />
        : query.isError ? <SummaryError error={query.error} onRetry={() => query.refetch()} />
          : !query.data ? contextUnavailable ? <SummaryContextState kind="unavailable" onRetry={() => contextQuery.refetch()} /> : <SummaryEmpty contextMissing={contextMissing} />
            : contextChecking && query.data.items.length === 0 ? <SummaryContextState kind="checking" />
              : contextUnavailable && query.data.items.length === 0 ? <SummaryContextState kind="unavailable" onRetry={() => contextQuery.refetch()} />
                : contextMissing && query.data.items.length === 0 ? <SummaryEmpty contextMissing />
                  : <SummaryContent data={query.data} period={period} contextUnavailable={contextUnavailable} />}
    </div>
  );
}

function PeriodTabs({ period, onChange }: { period: Period; onChange: (period: Period) => void }) {
  return (
    <div className="summary-period-tabs" role="group" aria-label="Summary period">
      {PERIOD_OPTIONS.map((option) => (
        <button
          type="button"
          className="summary-period-tab"
          aria-pressed={period === option.value}
          key={option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SummaryContent({ data, period, contextUnavailable = false }: { data: ExecutiveSummaryDto; period: Period; contextUnavailable?: boolean }) {
  const openIssue = useUiStore((state) => state.openIssue);
  const openIssueId = useUiStore((state) => state.openIssueId);

  return (
    <>
      {contextUnavailable && (
        <div className="summary-context-notice" role="status">
          <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
          <span>Company Context status could not be verified. Review the context status before interpreting an empty period.</span>
        </div>
      )}
      <div className="summary-meta-row">
        <span>{periodLabel(period)} · {formatDate(data.startAt)} — {formatDate(data.endAt)}</span>
        <span className="backend-ranking-note"><i /> Ranked by intelligence engine · Top {data.top5_limit}</span>
      </div>
      {data.items.length === 0 ? <SummaryEmpty /> : (
        <div className="summary-grid" aria-label="Executive issues">
          {data.items.map((issue, index) => (
            <button
              type="button"
              aria-label={`Open issue: ${issue.title}`}
              aria-pressed={openIssueId === issue.issueId}
              className={`summary-issue-card ${openIssueId === issue.issueId ? "is-selected" : ""}`}
              key={issue.issueId}
              onClick={() => openIssue(issue.issueId)}
            >
              <span className="issue-rank" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div className="summary-issue-body">
                <h2>{issue.title}</h2>
                <p>{issue.oneLiner || "No one-liner is available for this issue yet."}</p>
                <footer><time dateTime={issue.lastDevelopedAt}>Updated {formatDate(issue.lastDevelopedAt)}</time></footer>
              </div>
              <div className="summary-issue-side">
                <div className="badge-row"><PriorityBadge value={issue.priority} /><StatusBadge value={issue.status} /></div>
                <span className="summary-issue-open">View detail <ArrowRight size={14} strokeWidth={2} aria-hidden="true" /></span>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function PriorityBadge({ value }: { value: SummaryItem["priority"] }) {
  return <span className={`summary-badge summary-badge-priority-${value ?? "none"}`}>{priorityLabel(value)}</span>;
}
function StatusBadge({ value }: { value: SummaryItem["status"] }) { return <span className={`summary-badge summary-badge-status-${value}`}>{statusLabel(value)}</span>; }
function SummaryLoading() { return <><div className="summary-meta-skeleton" /><div className="summary-grid">{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <div className="summary-skeleton-card" key={item}><span /><span /><span /><span /></div>)}</div></>; }

function SummaryContextState({ kind, onRetry }: { kind: "checking" | "unavailable"; onRetry?: () => void | Promise<unknown> }) {
  const [retrying, setRetrying] = useState(false);
  const checking = kind === "checking";

  async function retry() {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="summary-empty summary-context-state" role={checking ? "status" : "alert"} aria-busy={checking || retrying}>
      <div className="summary-empty-mark">{checking ? <BusyLabel>Checking...</BusyLabel> : <AlertCircle size={20} strokeWidth={2} aria-hidden="true" />}</div>
      <h2>{checking ? "Checking Company Context status" : "Company Context status unavailable"}</h2>
      <p>{checking ? "We are verifying the leadership lens before treating this period as empty." : "The dashboard cannot confirm whether the company has an effective context right now."}</p>
      {!checking && onRetry && <button className="context-action" aria-busy={retrying} data-loading={retrying} disabled={retrying} onClick={() => void retry()}>{retrying ? <BusyLabel>Retrying...</BusyLabel> : "Try again"}</button>}
    </div>
  );
}

function SummaryEmpty({ contextMissing = false }: { contextMissing?: boolean }) {
  return <div className="summary-empty"><div className="summary-empty-mark"><Inbox size={20} strokeWidth={2} aria-hidden="true" /></div>{contextMissing ? <><h2>Set up Company Context to start intelligence</h2><p>This company has no approved context yet, so the engine cannot rank leadership-relevant signals.</p><Link className="context-action" href="/settings/company-context/versions">Open Company Context</Link></> : <><h2>No active signals in this period</h2><p>The intelligence engine found no eligible issues for the selected company and period.</p></>}</div>;
}

function SummaryError({ error, onRetry }: { error: unknown; onRetry: () => void | Promise<unknown> }) {
  const [retrying, setRetrying] = useState(false);
  const message = isAxiosError<{ error?: { message?: string } }>(error) ? error.response?.data?.error?.message ?? "The dashboard could not be reached." : "The dashboard could not be loaded.";
  async function retry() {
    if (retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }
  return <div className="summary-empty summary-error"><div className="summary-empty-mark"><AlertCircle size={20} strokeWidth={2} aria-hidden="true" /></div><h2>Executive Summary unavailable</h2><p>{message}</p><button className="context-action" aria-busy={retrying} data-loading={retrying} disabled={retrying} onClick={() => void retry()}>{retrying ? <BusyLabel>Retrying…</BusyLabel> : "Try again"}</button></div>;
}

function periodLabel(period: Period) { return PERIOD_OPTIONS.find((option) => option.value === period)?.summaryLabel ?? "Selected period"; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date); }
