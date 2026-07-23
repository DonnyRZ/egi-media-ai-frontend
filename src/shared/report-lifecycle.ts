import { isAxiosError } from "axios";

import { axiosClient } from "@/shared/lib/axios-client";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { useSessionStore } from "@/shared/session-store";
import type { ApiSuccessResponse } from "@/shared/types/api.types";

export type ReportReviewStatus = "draft" | "in_review" | "approved" | "shared" | "needs_review";

export interface ReportLifecycleDto {
  report_id: string;
  report_type: "harian" | "mingguan" | "bulanan";
  period_start: string;
  period_end: string;
  timezone: string;
  context_version: number;
  metrics: Record<string, unknown>;
  selected_issue_pack: unknown[];
  review_status: ReportReviewStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

export async function submitReportForReview(reportId: string, version: number, comment?: string) {
  return transitionReport(reportId, "review", version, { action: "submit", comment });
}

export async function approveReport(reportId: string, version: number, note?: string) {
  return transitionReport(reportId, "approve", version, { note });
}

export async function shareReport(reportId: string, version: number, recipientRefs: string[], message?: string) {
  if (recipientRefs.length < 1 || recipientRefs.length > 100) throw new Error("At least one and at most 100 recipient references are required");
  return transitionReport(reportId, "share", version, { recipient_refs: recipientRefs, message });
}

/** `needs_review`/request-changes is intentionally not exposed: backend accepts only action=submit. */
export function isBackendSupportedReportStatus(status: ReportReviewStatus) {
  return status !== "needs_review";
}

export interface ReportLifecycleError {
  code: string;
  message: string;
  retryable: boolean;
}

export function getReportLifecycleError(error: unknown): ReportLifecycleError {
  if (isAxiosError<{ error?: { code?: string; message?: string }; meta?: { retryable?: boolean } }>(error)) {
    const code = error.response?.data?.error?.code ?? "REPORT_LIFECYCLE_ERROR";
    return { code, message: error.response?.data?.error?.message ?? "The report lifecycle action failed.", retryable: Boolean(error.response?.data?.meta?.retryable) };
  }
  return { code: "REPORT_LIFECYCLE_ERROR", message: error instanceof Error ? error.message : "The report lifecycle action failed.", retryable: false };
}

async function transitionReport(reportId: string, action: "review" | "approve" | "share", version: number, body: Record<string, unknown>) {
  if (!reportId.trim() || !Number.isInteger(version) || version < 1) throw new Error("A valid report ID and current version are required");
  const actor = useSessionStore.getState().actor;
  if (!actor || actor.actorType !== "human") throw Object.assign(new Error("Report lifecycle actions require a human actor"), { code: "HUMAN_ACTOR_REQUIRED" });
  const endpoint = action === "review" ? API_ENDPOINTS.reportReview(reportId) : action === "approve" ? API_ENDPOINTS.reportApprove(reportId) : API_ENDPOINTS.reportShare(reportId);
  const response = await axiosClient.post<ApiSuccessResponse<ReportLifecycleDto>>(endpoint, { ...body, version }, { headers: { "Idempotency-Key": `report-${action}-${reportId}-${version}-${crypto.randomUUID()}`, "If-Match": String(version) } });
  return response.data.data;
}
