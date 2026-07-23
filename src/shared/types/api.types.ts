export interface ApiMeta {
  request_id?: string | null;
  correlation_id?: string | null;
  trace_id?: string | null;
  retryable?: boolean;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: { code: string; message: string; details?: unknown };
  meta: ApiMeta;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
export interface CompanyOptionDto { company_id: string; name: string | null; }
export interface CompanyOptionListDto { items: CompanyOptionDto[]; }

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface IssueCardDto {
  issue_id: string;
  title: string;
  one_liner: string | null;
  status: "baru" | "berkembang" | "dipantau" | "selesai";
  priority: "tinggi" | "sedang" | "rendah" | null;
  first_seen_at: string;
  last_developed_at: string | null;
  version: number;
}

export interface IssueListDto {
  items: IssueCardDto[];
  meta: PaginationMeta;
}

export interface CompanyContextDto {
  context_id: string;
  company_id: string;
  version: number;
  status: string;
  source: unknown;
  draft_id: string | null;
  fields: Record<string, unknown>;
  change_reason: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertPreferenceDto {
  recipient_id: string;
  direct_high_enabled: boolean;
  daily_digest_enabled: boolean;
  timezone: string;
  quiet_hours: { start: string; end: string } | null;
}

export interface SavedIssueDto { saved_id: string; issue_id: string; saved_at: string; issue: IssueCardDto; }
export interface SavedIssueListDto { items: SavedIssueDto[]; meta: PaginationMeta; }
export interface InboxEmailDto { email_id: string; issue_id: string | null; development_id: string | null; channel: "langsung" | "ringkasan" | string; status: string; reason_code: string | null; read: boolean; created_at: string; }
export interface InboxEmailListDto { items: InboxEmailDto[]; meta: PaginationMeta; }
export type ReportReviewStatus = "draft" | "in_review" | "approved" | "shared" | "needs_review";
export interface ReportDto { report_id: string; report_type: "harian" | "mingguan" | "bulanan"; period_start: string; period_end: string; timezone: string; context_version: number; metrics: Record<string, unknown>; selected_issue_pack: unknown[]; review_status: ReportReviewStatus; version: number; created_at: string; updated_at: string; }
export interface ReportListDto { items: ReportDto[]; meta: PaginationMeta; }
export interface ReportDetailDto { report: ReportDto; narrative: Record<string, unknown> | null; activity: Array<Record<string, unknown>>; }
