"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { AppSelect } from "@/shared/app-select";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { ScopeRequired } from "@/shared/prerequisite-gate";
import { useSessionStore } from "@/shared/session-store";
import { approveReport, shareReport, submitReportForReview } from "@/shared/report-lifecycle";
import { ConstrainedRewritePanel } from "@/shared/constrained-rewrite";
import { useWorkspaceScope } from "@/shared/workspace-scope";
import type { ApiSuccessResponse, ReportDetailDto, ReportListDto, ReportDto } from "@/shared/types/api.types";

type ReportTypeFilter = "all" | "harian" | "mingguan" | "bulanan";
type ReportStatusFilter = "all" | "draft" | "in_review" | "approved" | "shared" | "needs_review";
type ReportRewriteSpan = { spanId: string; label: string; text: string; sourceClaimIds: string[] };

const REPORT_TYPE_LABELS: Record<Exclude<ReportTypeFilter, "all">, string> = {
  harian: "Daily",
  mingguan: "Weekly",
  bulanan: "Monthly",
};

const REPORT_STATUS_LABELS: Record<Exclude<ReportStatusFilter, "all">, string> = {
  draft: "Draft",
  in_review: "In review",
  needs_review: "Needs review",
  approved: "Approved",
  shared: "Shared",
};

function formatReportDate(value: string, timezone?: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: timezone || undefined }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  }
}

function formatReportRange(start: string, end: string, timezone?: string) {
  return `${formatReportDate(start, timezone)} \u2192 ${formatReportDate(end, timezone)}`;
}

function reportTypeLabel(value: string) {
  return REPORT_TYPE_LABELS[value as Exclude<ReportTypeFilter, "all">] || value;
}

function reportStatusLabel(value: string) {
  return REPORT_STATUS_LABELS[value as Exclude<ReportStatusFilter, "all">] || value.replaceAll("_", " ");
}

function reportActionError(error: unknown) {
  const backendMessage = isAxiosError(error) ? error.response?.data?.error?.message : null;
  const message = typeof backendMessage === "string" ? backendMessage : error instanceof Error ? error.message : "Report action failed.";
  if (/validated draft narrative/i.test(message)) return "This report is waiting for a validated executive narrative before it can move forward.";
  return message;
}

async function readReports(reportType: ReportTypeFilter, reviewStatus: ReportStatusFilter) {
  const response = await axiosClient.get<ApiSuccessResponse<ReportListDto>>(API_ENDPOINTS.reports, {
    params: {
      page: 1,
      limit: 50,
      report_type: reportType === "all" ? undefined : reportType,
      review_status: reviewStatus === "all" ? undefined : reviewStatus,
    },
  });
  return response.data.data;
}

async function readReport(reportId: string) {
  const response = await axiosClient.get<ApiSuccessResponse<ReportDetailDto>>(API_ENDPOINTS.reportById(reportId));
  return response.data.data;
}

export function ReportsWorkspace() {
  const scope = useWorkspaceScope();

  return (
    <ScopeRequired
      require="company"
      scope={scope}
      title="Company scope required for reports"
      reason={'Reports are company-scoped. Without an active company, “no reports yet” would look like the customer has zero drafts — that is not the case here.'}
      nextStep="Pick a company in the header switcher. If none exist, provision one under Platform, then return here."
    >
      <ReportsWorkspaceBody />
    </ScopeRequired>
  );
}

function ReportsWorkspaceBody() {
  const companyId = useSessionStore((state) => state.activeCompanyId);
  const [selected, setSelected] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportTypeFilter>("all");
  const [reviewStatus, setReviewStatus] = useState<ReportStatusFilter>("all");
  const query = useQuery({ queryKey: ["reports", companyId, reportType, reviewStatus], queryFn: () => readReports(reportType, reviewStatus), enabled: Boolean(companyId), staleTime: 15_000 });

  return (
    <div className="issues-page">
      <div className="page-context">
        <span className="supporting-text">Review validated report drafts before approval and sharing.</span>
      </div>
      {query.isLoading ? (
        <div className="issues-empty"><h2>Loading reports...</h2></div>
      ) : query.isError ? (
        <div className="issues-empty">
          <h2>Reports unavailable</h2>
          <p>The report read API could not be loaded.</p>
          <button className="context-action" onClick={() => query.refetch()}>Try again</button>
        </div>
      ) : (
        <div className="reports-workspace">
          <div className="issues-toolbar reports-toolbar">
            <AppSelect
              value={reportType}
              aria-label="Filter reports by period"
              options={[
                { value: "all", label: "All report periods" },
                { value: "harian", label: "Daily" },
                { value: "mingguan", label: "Weekly" },
                { value: "bulanan", label: "Monthly" },
              ]}
              onChange={(value) => setReportType(value as ReportTypeFilter)}
            />
            <AppSelect
              value={reviewStatus}
              aria-label="Filter reports by review status"
              options={[
                { value: "all", label: "All statuses" },
                { value: "draft", label: "Draft" },
                { value: "in_review", label: "In review" },
                { value: "needs_review", label: "Needs review" },
                { value: "approved", label: "Approved" },
                { value: "shared", label: "Shared" },
              ]}
              onChange={(value) => setReviewStatus(value as ReportStatusFilter)}
            />
          </div>
          {!query.data?.items.length ? (
            <div className="issues-empty">
              <h2>No reports yet</h2>
              <p>Reports appear after the backend creates a validated report draft.</p>
            </div>
          ) : (
            <div className="issues-list">
              {query.data.items.map((report) => (
                <ReportCard key={report.report_id} report={report} onOpen={() => setSelected(report.report_id)} />
              ))}
            </div>
          )}
          {selected && <ReportDetail reportId={selected} onClose={() => setSelected(null)} />}
        </div>
      )}
    </div>
  );
}

function ReportCard({ report, onOpen }: { report: ReportDto; onOpen: () => void }) {
  return (
    <article
      className="issue-list-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="issue-list-copy">
        <div className="badge-row issue-list-meta">
          <span className={`meta-tag meta-review-${report.review_status}`}>{reportStatusLabel(report.review_status)}</span>
          <span className="meta-tag">{reportTypeLabel(report.report_type)}</span>
        </div>
        <h2>{formatReportRange(report.period_start, report.period_end, report.timezone)}</h2>
        <p>Version {report.version} {"\u00b7"} {report.selected_issue_pack.length} validated issue items</p>
      </div>
    </article>
  );
}

function ReportDetail({ reportId, onClose }: { reportId: string; onClose: () => void }) {
  const companyId = useSessionStore((state) => state.activeCompanyId);
  const permissions = useSessionStore((state) => state.permissions);
  const client = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const recipientRef = process.env.NEXT_PUBLIC_REPORT_SHARE_RECIPIENT_REF?.trim() || "";
  const query = useQuery({ queryKey: ["report", companyId, reportId], queryFn: () => readReport(reportId), enabled: Boolean(companyId && reportId) });
  const [selectedRewriteSpan, setSelectedRewriteSpan] = useState<ReportRewriteSpan | null>(null);
  const command = useMutation({
    mutationFn: async ({ action, report }: { action: "review" | "approve" | "share"; report: ReportDto }) => action === "review"
      ? submitReportForReview(report.report_id, report.version)
      : action === "approve"
        ? approveReport(report.report_id, report.version)
        : recipientRef
          ? shareReport(report.report_id, report.version, [recipientRef])
          : Promise.reject(new Error("Recipient reference is required.")),
    onSuccess: () => {
      setNotice("Backend confirmed the lifecycle transition.");
      void client.invalidateQueries({ queryKey: ["report", companyId, reportId] });
      void client.invalidateQueries({ queryKey: ["reports", companyId] });
    },
    onError: (error) => setNotice(reportActionError(error)),
  });
  if (query.isLoading) return <ReportModal><h2>Loading report...</h2></ReportModal>;
  if (query.isError || !query.data) return <ReportModal><h2>Report unavailable</h2><button onClick={onClose}>Close</button></ReportModal>;

  const report = query.data.report;
  const canSubmitReview = permissions.includes("report.review.submit");
  const canApprove = permissions.includes("report.approve");
  const canShare = permissions.includes("report.share");
  const lifecycleAllowed = report.review_status === "draft" ? canSubmitReview : report.review_status === "in_review" ? canApprove : report.review_status === "approved" ? canShare : true;
  if (!lifecycleAllowed) return <ReadOnlyReportDetail report={report} detail={query.data} onClose={onClose} />;

  const narrativeReady = query.data.narrative?.review_status === "draft";
  const action = report.review_status === "draft" ? "review" : report.review_status === "in_review" ? "approve" : report.review_status === "approved" ? "share" : null;
  const actionLabel = report.review_status === "draft" ? "Submit review" : report.review_status === "in_review" ? "Approve" : report.review_status === "approved" ? "Share" : null;
  const rewriteSpans = report.review_status === "draft" ? extractRewriteSpans(query.data.narrative) : [];
  const narrativeIdentity = reportNarrativeIdentity(query.data.narrative);

  return (
    <ReportModal onClose={onClose}>
      <ReportDetailHeader report={report} />
      <div className="report-detail-body">
        <section><h3>Executive narrative</h3><JsonSection value={query.data.narrative} /></section>
        {narrativeIdentity && rewriteSpans.length > 0 && (
          <ReportRewriteSection
            report={report}
            narrative={narrativeIdentity}
            spans={rewriteSpans}
            selected={selectedRewriteSpan}
            onSelect={setSelectedRewriteSpan}
            onApplied={() => {
              void client.invalidateQueries({ queryKey: ["report", companyId, reportId] });
            }}
          />
        )}
        <section><h3>Validated issue pack</h3><JsonSection value={report.selected_issue_pack} /></section>
        <section><h3>Metrics and provenance</h3><JsonSection value={report.metrics} /></section>
        <section><h3>Activity history</h3><JsonSection value={query.data.activity} /></section>
      </div>
      {action && <div className="report-detail-actions">
        {narrativeReady ? (
          <button className="context-action" disabled={command.isPending} onClick={() => command.mutate({ action, report })}>{actionLabel}</button>
        ) : (
          <p className="supporting-text">Waiting for a validated executive narrative before this report can move forward.</p>
        )}
      </div>}
      {notice && <div className="preference-notice report-detail-notice" role="status">{notice}</div>}
    </ReportModal>
  );
}

function reportNarrativeIdentity(value: Record<string, unknown> | null) {
  if (!value || typeof value.report_narrative_id !== "string" || !value.report_narrative_id || !Number.isInteger(value.version)) return null;
  return { narrativeId: value.report_narrative_id, version: value.version as number };
}

function extractRewriteSpans(value: Record<string, unknown> | null): ReportRewriteSpan[] {
  if (!value || !value.narrative || typeof value.narrative !== "object" || Array.isArray(value.narrative)) return [];
  const narrative = value.narrative as Record<string, unknown>;
  const spans: ReportRewriteSpan[] = [];
  const citedText = (item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.narrative !== "string" || !candidate.narrative.trim() || !Array.isArray(candidate.sourceClaimIds)) return null;
    const sourceClaimIds = candidate.sourceClaimIds.filter((id): id is string => typeof id === "string" && Boolean(id));
    return sourceClaimIds.length ? { text: candidate.narrative, sourceClaimIds } : null;
  };
  const issues = Array.isArray(narrative.issueNarratives) ? narrative.issueNarratives : [];
  for (const item of issues) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const candidate = item as Record<string, unknown>;
    const cited = citedText(candidate);
    if (cited && typeof candidate.reportItemId === "string" && candidate.reportItemId) spans.push({ spanId: `issue_narrative:${candidate.reportItemId}`, label: `Issue narrative · ${candidate.reportItemId}`, ...cited });
  }
  const impact = citedText(narrative.impactNarrative);
  if (impact) spans.push({ spanId: "impact_narrative", label: "Impact narrative", ...impact });
  const watchItems = Array.isArray(narrative.watchItems) ? narrative.watchItems : [];
  watchItems.forEach((item, index) => {
    const cited = citedText(item);
    if (cited) spans.push({ spanId: `watch_item:${index}`, label: `Watch item ${index + 1}`, ...cited });
  });
  return spans;
}

function ReportRewriteSection({
  report,
  narrative,
  spans,
  selected,
  onSelect,
  onApplied,
}: {
  report: ReportDto;
  narrative: { narrativeId: string; version: number };
  spans: ReportRewriteSpan[];
  selected: ReportRewriteSpan | null;
  onSelect: (span: ReportRewriteSpan | null) => void;
  onApplied: () => void;
}) {
  return (
    <section className="report-rewrite-section">
      <div className="report-rewrite-heading">
        <div>
          <h3>Human-only edit</h3>
          <p>Select one cited narrative span to request a bounded rewrite.</p>
        </div>
        <span className="preference-readonly">Citation set locked</span>
      </div>
      <div className="report-span-list" role="list" aria-label="Cited narrative spans">
        {spans.map((span) => (
          <button
            key={span.spanId}
            type="button"
            className={`report-span-option${selected?.spanId === span.spanId ? " is-selected" : ""}`}
            aria-pressed={selected?.spanId === span.spanId}
            onClick={() => onSelect(selected?.spanId === span.spanId ? null : span)}
          >
            <strong>{span.label}</strong>
            <span>{span.text}</span>
          </button>
        ))}
      </div>
      {selected && (
        <ConstrainedRewritePanel
          reportId={report.report_id}
          narrativeId={narrative.narrativeId}
          version={narrative.version}
          spanId={selected.spanId}
          currentText={selected.text}
          approvedSourceClaimIds={selected.sourceClaimIds}
          onApplied={onApplied}
        />
      )}
    </section>
  );
}

function ReadOnlyReportDetail({ report, detail, onClose }: { report: ReportDto; detail: ReportDetailDto; onClose: () => void }) {
  return (
    <ReportModal onClose={onClose}>
      <ReportDetailHeader report={report} />
      <div className="report-detail-body">
        <p className="supporting-text report-read-only-note">This report is read-only for your role.</p>
        <section><h3>Executive narrative</h3><JsonSection value={detail.narrative} /></section>
        <section><h3>Validated issue pack</h3><JsonSection value={report.selected_issue_pack} /></section>
        <section><h3>Metrics and provenance</h3><JsonSection value={report.metrics} /></section>
        <section><h3>Activity history</h3><JsonSection value={detail.activity} /></section>
      </div>
    </ReportModal>
  );
}

function ReportDetailHeader({ report }: { report: ReportDto }) {
  return (
    <header className="report-detail-header">
      <div className="eyebrow">Report detail</div>
      <h2>{reportTypeLabel(report.report_type)} report</h2>
      <p>{formatReportRange(report.period_start, report.period_end, report.timezone)}</p>
      <ReportMeta report={report} />
    </header>
  );
}

function ReportModal({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return <div className="source-preview-layer"><section className="source-preview-card report-detail-card" role="dialog" aria-label="Report detail" aria-modal="true">{onClose && <button className="drawer-close" onClick={onClose} aria-label="Close report detail"><X size={18} strokeWidth={2} aria-hidden="true" /></button>}{children}</section></div>;
}

function ReportMeta({ report }: { report: ReportDto }) {
  return <div className="badge-row issue-list-meta"><span className={`meta-tag meta-review-${report.review_status}`}>{reportStatusLabel(report.review_status)}</span><span className="meta-tag">Version {report.version}</span><span className="meta-tag">Context v{report.context_version}</span></div>;
}

function JsonSection({ value }: { value: unknown }) {
  if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) return <p>No validated data available.</p>;
  return <div className="report-readable-value"><ReadableValue value={value} /></div>;
}

function ReadableValue({ value }: { value: unknown }): ReactNode {
  if (value === null || value === undefined || value === "") return <span className="report-empty-value">Not provided</span>;
  if (Array.isArray(value)) return <ul className="report-value-list">{value.map((item, index) => <li key={index}><ReadableValue value={item} /></li>)}</ul>;
  if (typeof value === "object") return <dl className="report-value-object">{Object.entries(value as Record<string, unknown>).map(([key, item]) => <div key={key}><dt>{humanize(key)}</dt><dd><ReadableValue value={item} /></dd></div>)}</dl>;
  return <span>{String(value)}</span>;
}

function humanize(value: string) { return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
