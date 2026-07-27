"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { X } from "lucide-react";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { ScopeRequired } from "@/shared/prerequisite-gate";
import { useSessionStore } from "@/shared/session-store";
import { approveReport, shareReport, submitReportForReview } from "@/shared/report-lifecycle";
import { useWorkspaceScope } from "@/shared/workspace-scope";
import type { ApiSuccessResponse, ReportDetailDto, ReportListDto, ReportDto } from "@/shared/types/api.types";

type ReportTypeFilter = "all" | "harian" | "mingguan" | "bulanan";
type ReportStatusFilter = "all" | "draft" | "in_review" | "approved" | "shared" | "needs_review";

async function readReports(reportType: ReportTypeFilter, reviewStatus: ReportStatusFilter) {
  const response = await axiosClient.get<ApiSuccessResponse<ReportListDto>>(API_ENDPOINTS.reports, { params: { page: 1, limit: 50, report_type: reportType === "all" ? undefined : reportType, review_status: reviewStatus === "all" ? undefined : reviewStatus } });
  return response.data.data;
}
async function readReport(reportId: string) { const response = await axiosClient.get<ApiSuccessResponse<ReportDetailDto>>(API_ENDPOINTS.reportById(reportId)); return response.data.data; }

export function ReportsWorkspace() {
  const scope = useWorkspaceScope();

  return (
    <ScopeRequired
      require="company"
      scope={scope}
      title="Company scope required for reports"
      reason="Reports are company-scoped. Without an active company, “no reports yet” would look like the customer has zero drafts — that is not the case here."
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
            <select value={reportType} onChange={(event) => setReportType(event.target.value as ReportTypeFilter)} aria-label="Filter reports by period">
              <option value="all">All report periods</option>
              <option value="harian">Daily</option>
              <option value="mingguan">Weekly</option>
              <option value="bulanan">Monthly</option>
            </select>
            <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as ReportStatusFilter)} aria-label="Filter reports by review status">
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="in_review">In review</option>
              <option value="needs_review">Needs review</option>
              <option value="approved">Approved</option>
              <option value="shared">Shared</option>
            </select>
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

function ReportCard({ report, onOpen }: { report: ReportDto; onOpen: () => void }) { return <article className="issue-list-card" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(event) => event.key === "Enter" && onOpen()}><div className="issue-list-copy"><div className="badge-row issue-list-meta"><span className={`meta-tag meta-review-${report.review_status}`}>{report.review_status.replaceAll("_", " ")}</span><span className="meta-tag">{report.report_type}</span></div><h2>{report.period_start} → {report.period_end}</h2><p>Version {report.version} · {report.selected_issue_pack.length} validated issue items</p></div></article>; }

function ReportDetail({ reportId, onClose }: { reportId: string; onClose: () => void }) {
  const companyId = useSessionStore((state) => state.activeCompanyId); const client = useQueryClient(); const [notice, setNotice] = useState<string | null>(null); const recipientRef = process.env.NEXT_PUBLIC_REPORT_SHARE_RECIPIENT_REF?.trim() || "";
  const query = useQuery({ queryKey: ["report", companyId, reportId], queryFn: () => readReport(reportId), enabled: Boolean(companyId && reportId) });
  const command = useMutation({ mutationFn: async ({ action, report }: { action: "review" | "approve" | "share"; report: ReportDto }) => action === "review" ? submitReportForReview(report.report_id, report.version) : action === "approve" ? approveReport(report.report_id, report.version) : recipientRef ? shareReport(report.report_id, report.version, [recipientRef]) : Promise.reject(new Error("Recipient reference is required.")), onSuccess: () => { setNotice("Backend confirmed the lifecycle transition."); void client.invalidateQueries({ queryKey: ["report", companyId, reportId] }); void client.invalidateQueries({ queryKey: ["reports", companyId] }); }, onError: (error) => setNotice(error instanceof Error ? error.message : "Report action failed.") });
  if (query.isLoading) return <div className="source-preview-layer"><section className="source-preview-card" role="dialog" aria-label="Report detail"><h2>Loading report...</h2></section></div>;
  if (query.isError || !query.data) return <div className="source-preview-layer"><section className="source-preview-card" role="dialog" aria-label="Report detail"><h2>Report unavailable</h2><button onClick={onClose}>Close</button></section></div>;
  const report = query.data.report;
  return <div className="source-preview-layer"><section className="source-preview-card report-detail-card" role="dialog" aria-label="Report detail"><button className="drawer-close" onClick={onClose} aria-label="Close report detail"><X size={18} strokeWidth={2} aria-hidden="true" /></button><div className="eyebrow">Report detail</div><h2>{report.report_type} report</h2><p>{report.period_start} → {report.period_end}</p><div className="badge-row issue-list-meta"><span className={`meta-tag meta-review-${report.review_status}`}>{report.review_status.replaceAll("_", " ")}</span><span className="meta-tag">Version {report.version}</span><span className="meta-tag">Context v{report.context_version}</span></div><section><h3>Executive narrative</h3><JsonSection value={query.data.narrative} /></section><section><h3>Validated issue pack</h3><JsonSection value={report.selected_issue_pack} /></section><section><h3>Metrics and provenance</h3><JsonSection value={report.metrics} /></section><section><h3>Activity history</h3><JsonSection value={query.data.activity} /></section><div className="context-flow-actions">{report.review_status === "draft" && <button className="context-action" disabled={command.isPending} onClick={() => command.mutate({ action: "review", report })}>Submit review</button>}{report.review_status === "in_review" && <button className="context-action" disabled={command.isPending} onClick={() => command.mutate({ action: "approve", report })}>Approve</button>}{report.review_status === "approved" && <button className="context-action" disabled={command.isPending} onClick={() => command.mutate({ action: "share", report })}>Share</button>}</div>{notice && <div className="preference-notice" role="status">{notice}</div>}</section></div>;
}

function JsonSection({ value }: { value: unknown }) {
  if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) return <p>No validated data available.</p>;
  return <div className="report-readable-value"><ReadableValue value={value} /> </div>;
}

function ReadableValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return <span className="report-empty-value">Not provided</span>;
  if (Array.isArray(value)) return <ul className="report-value-list">{value.map((item, index) => <li key={index}><ReadableValue value={item} /></li>)}</ul>;
  if (typeof value === "object") return <dl className="report-value-object">{Object.entries(value as Record<string, unknown>).map(([key, item]) => <div key={key}><dt>{humanize(key)}</dt><dd><ReadableValue value={item} /></dd></div>)}</dl>;
  return <span>{String(value)}</span>;
}

function humanize(value: string) { return value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
