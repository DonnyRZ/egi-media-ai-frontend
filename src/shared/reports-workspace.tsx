"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertCircle, ArrowRight, Download, FileText, X } from "lucide-react";
import { AppSelect } from "@/shared/app-select";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { ScopeRequired } from "@/shared/prerequisite-gate";
import { useSessionStore } from "@/shared/session-store";
import { approveReport, shareReport, submitReportForReview } from "@/shared/report-lifecycle";
import { ConstrainedRewritePanel } from "@/shared/constrained-rewrite";
import { useFocusTrap } from "@/shared/focus-trap";
import { useWorkspaceScope } from "@/shared/workspace-scope";
import type { ApiSuccessResponse, ReportDetailDto, ReportListDto, ReportDto } from "@/shared/types/api.types";
import { BusyLabel, CollectionEmptyState, CollectionLoading, CollectionPagination } from "@/shared/ux-state";

type ReportTypeFilter = "all" | "harian" | "mingguan" | "bulanan";
type ReportStatusFilter = "all" | "draft" | "in_review" | "approved" | "shared" | "needs_review";
type ReportRewriteSpan = { spanId: string; label: string; text: string; sourceClaimIds: string[] };

const REPORTS_PAGE_SIZE = 20;

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

function reportReadError(error: unknown) {
  const backendMessage = isAxiosError(error) ? error.response?.data?.error?.message : null;
  return typeof backendMessage === "string" ? backendMessage : error instanceof Error ? error.message : "The report detail could not be loaded.";
}

async function readReports(reportType: ReportTypeFilter, reviewStatus: ReportStatusFilter, page: number) {
  const response = await axiosClient.get<ApiSuccessResponse<ReportListDto>>(API_ENDPOINTS.reports, {
    params: {
      page,
      limit: REPORTS_PAGE_SIZE,
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

async function downloadReportPdf(reportId: string) {
  const response = await axiosClient.get(API_ENDPOINTS.reportPdf(reportId), { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `egi-media-report-${reportId}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
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
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [companyId, reportType, reviewStatus]);
  const query = useQuery({ queryKey: ["reports", companyId, reportType, reviewStatus, page], queryFn: () => readReports(reportType, reviewStatus, page), enabled: Boolean(companyId), staleTime: 15_000, placeholderData: keepPreviousData });

  return (
    <div className="issues-page">
      <div className="page-context">
        <span className="supporting-text">Review validated report drafts before approval and sharing.</span>
      </div>
      <div className="reports-workspace" aria-busy={query.isLoading}>
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
          {query.isFetching && !query.isLoading && <div className="collection-refresh-status" role="status"><BusyLabel>Updating reports...</BusyLabel></div>}
          {query.isLoading ? (
            <CollectionLoading label="Loading reports..." rows={4} className="reports-loading" />
          ) : query.isError ? (
            <CollectionEmptyState icon={AlertCircle} tone="error" title="Reports unavailable" message="The report read API could not be loaded.">
              <button className="context-action" aria-busy={query.isFetching} data-loading={query.isFetching} disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? <BusyLabel>Retrying…</BusyLabel> : "Try again"}</button>
            </CollectionEmptyState>
          ) : !query.data?.items.length ? (
            <CollectionEmptyState icon={FileText} title="No reports yet" message="Reports appear after the backend creates a validated report draft." />
          ) : (
           <div className="issues-list">
              {query.data.items.map((report) => <ReportCard key={report.report_id} report={report} onOpen={() => setSelected(report.report_id)} />)}
           </div>
          )}
          {query.data && <CollectionPagination page={page} total={query.data.meta.total} limit={query.data.meta.limit || REPORTS_PAGE_SIZE} onPageChange={setPage} isFetching={query.isFetching} label="reports" />}
          {selected && <ReportDetail reportId={selected} onClose={() => setSelected(null)} />}
        </div>
    </div>
  );
}

function ReportCard({ report, onOpen }: { report: ReportDto; onOpen: () => void }) {
  return (
    <button type="button" className="report-list-row" onClick={onOpen}>
      <div className="report-list-copy">
        <div className="badge-row issue-list-meta">
          <span className={`meta-tag meta-review-${report.review_status}`}>{reportStatusLabel(report.review_status)}</span>
          <span className="meta-tag">{reportTypeLabel(report.report_type)}</span>
        </div>
        <h2>{formatReportRange(report.period_start, report.period_end, report.timezone)}</h2>
        <p>{report.selected_issue_pack.length} validated issue items {"\u00b7"} Version {report.version}</p>
      </div>
      <span className="report-list-open">Open report <ArrowRight size={15} strokeWidth={2} aria-hidden="true" /></span>
    </button>
  );
}

function ReportDetail({ reportId, onClose }: { reportId: string; onClose: () => void }) {
  const companyId = useSessionStore((state) => state.activeCompanyId);
  const permissions = useSessionStore((state) => state.permissions);
  const client = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const pdfCommand = useMutation({ mutationFn: () => downloadReportPdf(reportId), onError: (error) => setNotice(reportReadError(error)) });
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
  if (query.isLoading) return <ReportModal onClose={onClose}><CollectionLoading label="Loading report..." rows={3} className="report-detail-loading" /></ReportModal>;
  if (query.isError || !query.data) return <ReportModal onClose={onClose}><div className="drawer-state"><h2>Report unavailable</h2><p>{query.isError ? reportReadError(query.error) : "The backend returned an empty report response."}</p><button className="context-action" aria-busy={query.isFetching} data-loading={query.isFetching} disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? <BusyLabel>Retrying...</BusyLabel> : "Try again"}</button></div></ReportModal>;

  const report = query.data.report;
  const canSubmitReview = permissions.includes("report.review.submit");
  const canApprove = permissions.includes("report.approve");
  const canShare = permissions.includes("report.share");
  const canInspectOperationalDetails = permissions.includes("report.create") || permissions.includes("report.review.submit") || permissions.includes("audit.read");
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
        <ReportNarrativeReader report={report} narrative={query.data.narrative} />
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
        <ReportOperationalDetails report={report} activity={query.data.activity} canInspect={canInspectOperationalDetails} />
      </div>
      <div className="report-detail-actions">
        <button type="button" className="report-secondary-action" disabled={pdfCommand.isPending || !query.data.narrative} onClick={() => pdfCommand.mutate()}>{pdfCommand.isPending ? <BusyLabel>Preparing PDF…</BusyLabel> : <><Download size={16} aria-hidden="true" /> Download PDF</>}</button>
      {action && <>
        {narrativeReady ? (
           <button className="context-action" aria-busy={command.isPending} data-loading={command.isPending} disabled={command.isPending} onClick={() => command.mutate({ action, report })}>{command.isPending ? <BusyLabel>{action === "review" ? "Submitting review…" : action === "approve" ? "Approving…" : "Sharing…"}</BusyLabel> : actionLabel}</button>
        ) : (
          <p className="supporting-text">Waiting for a validated executive narrative before this report can move forward.</p>
        )}
      </>}</div>
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
    const text = typeof candidate.text === "string" ? candidate.text : candidate.narrative;
    if (typeof text !== "string" || !text.trim() || !Array.isArray(candidate.sourceClaimIds)) return null;
    const sourceClaimIds = candidate.sourceClaimIds.filter((id): id is string => typeof id === "string" && Boolean(id));
    return sourceClaimIds.length ? { text, sourceClaimIds } : null;
  };
  const structuredIssues = Array.isArray(narrative.issueSections) ? narrative.issueSections : [];
  for (const item of structuredIssues) {
    if (!item || typeof item !== "object" || Array.isArray(item) || typeof item.reportItemId !== "string" || !Array.isArray(item.sourceClaimIds)) continue;
    for (const field of ["whatHappened", "whyImportant", "impact", "risk", "watch"] as const) {
      const value = item[field];
      const text = Array.isArray(value) && typeof value[0] === "string" ? value[0] : null;
      if (text?.trim()) spans.push({ spanId: `issue_section:${item.reportItemId}:${field}`, label: `${humanize(field)} · ${item.reportItemId}`, text, sourceClaimIds: (Array.isArray(item.sourceClaimIds) ? item.sourceClaimIds : []).filter((id: unknown): id is string => typeof id === "string" && Boolean(id)) });
    }
  }
  const issues = structuredIssues.length > 0 ? structuredIssues : Array.isArray(narrative.issueNarratives) ? narrative.issueNarratives : [];
  for (const item of issues) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const candidate = item as Record<string, unknown>;
    const cited = citedText(structuredIssues.length > 0 ? candidate.narrative : candidate);
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
  const permissions = useSessionStore((state) => state.permissions);
  const canInspectOperationalDetails = permissions.includes("report.create") || permissions.includes("report.review.submit") || permissions.includes("audit.read");
  const pdfCommand = useMutation({ mutationFn: () => downloadReportPdf(report.report_id) });
  return (
    <ReportModal onClose={onClose}>
      <ReportDetailHeader report={report} />
      <div className="report-detail-body">
        <p className="supporting-text report-read-only-note">This report is read-only for your role.</p>
        <ReportNarrativeReader report={report} narrative={detail.narrative} />
        <ReportOperationalDetails report={report} activity={detail.activity} canInspect={canInspectOperationalDetails} />
      </div>
      <div className="report-detail-actions"><button type="button" className="report-secondary-action" disabled={pdfCommand.isPending || !detail.narrative} onClick={() => pdfCommand.mutate()}>{pdfCommand.isPending ? <BusyLabel>Preparing PDF…</BusyLabel> : <><Download size={16} aria-hidden="true" /> Download PDF</>}</button></div>
    </ReportModal>
  );
}

function ReportNarrativeReader({ report, narrative }: { report: ReportDto; narrative: Record<string, unknown> | null }) {
  if (!narrative) return <section className="report-narrative-empty"><div className="report-empty-icon"><FileText size={20} aria-hidden="true" /></div><h3>Narrative not ready</h3><p>The validated narrative is still being generated or needs review.</p></section>;
  const body = (narrative.narrative && typeof narrative.narrative === "object" && !Array.isArray(narrative.narrative) ? narrative.narrative : narrative) as Record<string, unknown>;
  const executive = asTextList(body.executiveSummary ?? body.executive_summary);
  const pack = asList(report.selected_issue_pack);
  const narrativeIssues = asList(body.issueSections ?? body.issue_sections ?? body.issue_narratives);
  const issues = narrativeIssues.map((item) => ({ ...(pack.find((source) => source.report_item_id === item.report_item_id || source.reportItemId === item.reportItemId) || {}), ...item }));
  const rawImpact = body.companyImpacts ?? body.company_impacts ?? body.impactNarrative ?? body.impact_narrative;
  const impacts = asList(rawImpact);
  const risks = asList(body.risks);
  const opportunities = asList(body.opportunities);
  const watch = asList(body.watchItems ?? body.watch_items);
  const trends = asList(body.trends);
  const sources = asList(body.sourceReferences ?? body.source_references);
  const overview = asList(body.overview);
  const categories = asList(body.categoryDevelopments ?? body.category_developments);
  const comparison = body.comparison && typeof body.comparison === "object" ? body.comparison as Record<string, unknown> : null;
  const followUp = asList(body.followUpOptions ?? body.follow_up_options);
  const riskOpportunity = asList(body.riskOpportunity ?? body.risk_opportunity);
  const metrics = report.metrics && typeof report.metrics === "object" ? ((report.metrics as Record<string, unknown>).values || report.metrics) : {};
  return <div className="report-structured-narrative" data-report-type={report.report_type}>
    <section className="report-executive-summary-block"><div className="report-subheading"><span className="eyebrow">Decision brief</span><h3>Executive summary</h3></div><ul className="report-point-list">{(executive.length ? executive : ["No executive summary was returned."]).map((item, index) => <li key={index}><span className="report-point-mark">•</span><span>{item}</span></li>)}</ul></section>
    {overview.length > 0 && <ReportListSection title="Month overview" eyebrow="Context" items={overview} />}
    {Object.keys(metrics as Record<string, unknown>).length > 0 && <section className="report-narrative-block"><div className="report-subheading"><span className="eyebrow">Backend indicators</span><h3>Period at a glance</h3></div><div className="report-metric-grid">{Object.entries(metrics as Record<string, unknown>).slice(0, 6).map(([key, value]) => <div className="report-metric-card" key={key}><span>{humanize(key)}</span><strong>{String(value)}</strong></div>)}</div></section>}
    {issues.length > 0 && <section className="report-narrative-block"><div className="report-subheading"><span className="eyebrow">Selected signals</span><h3>{report.report_type === "harian" ? "Most important issues today" : "Main developments"}</h3></div><div className="report-issue-sections">{issues.map((item, index) => <ReportIssueSection key={index} item={item} index={index} />)}</div></section>}
    {categories.length > 0 && <section className="report-narrative-block"><div className="report-subheading"><span className="eyebrow">Monthly view</span><h3>Developments by category</h3></div><div className="report-impact-grid">{categories.map((item, index) => <div className="report-impact-card" key={index}><h5>{String(item.category || item.title)}</h5><ul className="report-point-list">{asTextList(item.points).map((point, pointIndex) => <li key={pointIndex}><span className="report-point-mark">•</span><span>{point}</span></li>)}</ul>{asTextList(item.impact).length > 0 && <p><strong>Company impact:</strong> {asTextList(item.impact).join(" ")}</p>}</div>)}</div></section>}
    {comparison && <ReportComparison comparison={comparison} />}
    {(trends.length > 0 || report.report_type !== "harian") && <ReportListSection title={report.report_type === "bulanan" ? "Monthly strategic trends" : "Trends and developments"} eyebrow="Pattern" items={trends.length > 0 ? trends : [{ text: "No verified trend is supported by the selected evidence for this period." }]} />}
    {impacts.length > 0 && <ReportListSection title="Company impact" eyebrow="Leadership lens" items={impacts} />}
    {(risks.length > 0 || opportunities.length > 0 || riskOpportunity.length > 0) && <section className="report-narrative-block"><div className="report-subheading"><span className="eyebrow">Forward view</span><h3>Risks and opportunities</h3></div><div className="report-risk-grid">{([...riskOpportunity, ...risks.map((item) => ({ ...item, kind: "Risk" })), ...opportunities.map((item) => ({ ...item, kind: "Opportunity" }))] as Array<Record<string, unknown>>).map((item, index) => <div className="report-point-block" key={index}><h5>{String(item.kind || "Signal")}</h5><p>{String(item.text || item.narrative || item.title || "Not provided")}</p></div>)}</div></section>}
    {watch.length > 0 && <ReportListSection title="Watch next" eyebrow="Monitoring" items={watch} />}
    {followUp.length > 0 && <ReportListSection title="Follow-up options" eyebrow="For management consideration" items={followUp} />}
    {sources.length > 0 && <section className="report-narrative-block"><div className="report-subheading"><span className="eyebrow">Traceability</span><h3>Sources used</h3></div><ul className="report-source-reference-list">{sources.map((item, index) => <li key={index}><span>{String(item.claimId || item.claim_id || `Source ${index + 1}`)}</span><strong>{reportSourceLabel(item)}</strong></li>)}</ul></section>}
  </div>;
}

function ReportIssueSection({ item, index }: { item: Record<string, unknown>; index: number }) {
  const title = String(item.title || item.reportItemId || item.report_item_id || `Issue ${index + 1}`);
  const blocks: Array<[string, unknown]> = [["What happened", item.whatHappened ?? item.what_happened ?? item.narrative], ["Why it matters", item.whyMatters ?? item.why_matters], ["Impact", item.impact], ["Risk", item.risk], ["Watch", item.watch]];
  return <article className="report-issue-section"><div className="report-issue-section-heading"><span className="report-issue-index">{String(index + 1).padStart(2, "0")}</span><div className="report-issue-section-title"><h5>{title}</h5><div className="badge-row"><span className="meta-tag">{String(item.priority || "Signal")}</span>{Boolean(item.status) && <span className="meta-tag">{String(item.status)}</span>}{Boolean(item.group) && <span className="meta-tag">{String(item.group)}</span>}</div></div></div><div className="report-point-grid">{blocks.filter(([, value]) => value != null && String(value).trim()).map(([label, value]) => <div className="report-point-block" key={label}><h5>{label}</h5><p>{asTextList(value).join(" ")}</p></div>)}</div></article>;
}

function ReportComparison({ comparison }: { comparison: Record<string, unknown> }) { const groups = [["New", comparison.newItems ?? comparison.new_items], ["Worsened", comparison.worsened], ["Improved", comparison.improved], ["Priority shifts", comparison.priorityShifts ?? comparison.priority_shifts]] as Array<[string, unknown]>; return <section className="report-narrative-block"><div className="report-subheading"><span className="eyebrow">Comparison</span><h3>{String(comparison.label || "Compared with the previous period")}</h3></div><div className="report-change-grid">{groups.filter(([, value]) => asTextList(value).length > 0).map(([label, value]) => <div key={label}><h4>{label}</h4><ul className="report-point-list">{asTextList(value).map((point, index) => <li key={index}><span className="report-point-mark">•</span><span>{point}</span></li>)}</ul></div>)}</div></section>; }

function ReportListSection({ title, eyebrow, items }: { title: string; eyebrow: string; items: Record<string, unknown>[] }) { return <section className="report-narrative-block"><div className="report-subheading"><span className="eyebrow">{eyebrow}</span><h3>{title}</h3></div><ul className="report-point-list">{items.map((item, index) => <li key={index}><span className="report-point-mark">•</span><span>{String(item.text || item.narrative || item.title || asTextList(item).join(" "))}</span></li>)}</ul></section>; }

function asList(value: unknown): Record<string, unknown>[] { if (Array.isArray(value)) return value.map((item) => typeof item === "object" && item !== null && !Array.isArray(item) ? item as Record<string, unknown> : { text: String(item) }); if (value && typeof value === "object") return [value as Record<string, unknown>]; return []; }
function asTextList(value: unknown): string[] { if (Array.isArray(value)) return value.flatMap((item) => asTextList(item)); if (value && typeof value === "object") { const item = value as Record<string, unknown>; return [String(item.text || item.narrative || "")].filter(Boolean); } return value == null ? [] : [String(value)].filter(Boolean); }
function reportSourceLabel(item: Record<string, unknown>) { const title = item.title || item.article_title; if (typeof title === "string" && title.trim()) return title.trim(); const media = item.sourceName || item.source_name || item.media; if (typeof media === "string" && media.trim()) return media.trim(); const id = item.sourceArticleId || item.source_article_id; if (typeof id === "string") { const provider = /^crawl:([^:]+):/i.exec(id)?.[1]; if (provider) return provider.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); } return "Source article"; }

function ReportOperationalDetails({ report, activity, canInspect }: { report: ReportDto; activity: unknown; canInspect: boolean }) {
  const activityCount = Array.isArray(activity) ? activity.length : null;
  return (
    <details className="report-operational-details">
      <summary>
        <span className="report-operational-summary-copy">
          <strong>Report record</strong>
          <span>Traceability and lifecycle metadata</span>
        </span>
        <span className="report-operational-summary-meta">v{report.version} · Context v{report.context_version}</span>
      </summary>
      <div className="report-operational-content">
        <div className="report-operational-facts" aria-label="Report provenance summary">
          <div><span>Validated issue items</span><strong>{report.selected_issue_pack.length}</strong></div>
          <div><span>Report version</span><strong>v{report.version}</strong></div>
          <div><span>Context version</span><strong>v{report.context_version}</strong></div>
          {activityCount !== null && <div><span>Activity records</span><strong>{activityCount}</strong></div>}
        </div>
        {canInspect && (
          <div className="report-operational-data">
            <details>
              <summary>Validated issue pack</summary>
              <JsonSection value={report.selected_issue_pack} />
            </details>
            <details>
              <summary>Metrics and provenance</summary>
              <JsonSection value={report.metrics} />
            </details>
            <details>
              <summary>Activity history</summary>
              <JsonSection value={activity} />
            </details>
          </div>
        )}
      </div>
    </details>
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
  const modalRef = useRef<HTMLElement>(null);
  useFocusTrap(modalRef, Boolean(onClose), onClose ?? (() => undefined));
  return <div className="source-preview-layer"><button className="source-preview-backdrop" onClick={onClose} aria-label="Close report detail" disabled={!onClose} /><section ref={modalRef} className="source-preview-card report-detail-card" role="dialog" aria-label="Report detail" aria-modal="true">{onClose && <button className="drawer-close" onClick={onClose} aria-label="Close report detail"><X size={18} strokeWidth={2} aria-hidden="true" /></button>}{children}</section></div>;
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
