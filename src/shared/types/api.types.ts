import type { CompanyLanguage } from "@/shared/company-language";

export type { CompanyLanguage };

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
export interface CompanyOptionDto { company_id: string; tenant_id?: string; name: string | null; }
export interface CompanyOptionListDto { items: CompanyOptionDto[]; }
export interface AuthSessionDto { actor: { id: string; email: string | null; type: "human" | "service" | "ai_worker"; role: string | null; membership_id: string | null }; tenant_id: string | null; company_id: string | null; role: string | null; permissions: string[]; authorized_companies: Array<CompanyOptionDto & { role?: string }> | string[]; }
export interface LoginDto { access_token: string; token_type: "Bearer"; actor: { id: string; email: string; role: string | null; type: "human" | "service" | "ai_worker" }; tenant_id?: string | null; company_id?: string | null; permissions?: string[]; authorized_companies?: Array<CompanyOptionDto & { tenant_id?: string; role?: string }>; }
export interface MembershipDto { membership_id: string; user_id: string; tenant_id: string; company_id: string | null; role: string; status: string; version: number; permissions: string[]; }
export interface MembershipListDto { items: MembershipDto[]; meta: PaginationMeta; }

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

export type NewsFeedLayoutDto = "card" | "text";
export type NewsFeedProviderDto = "viral_x" | "cms" | "crawl" | string;

export interface NewsFeedItemDto {
  id: string;
  channel: string;
  provider: NewsFeedProviderDto;
  layout: NewsFeedLayoutDto;
  title: string | null;
  summary: string | null;
  published_at: string | null;
  source_url: string | null;
  thumbnail_url: string | null;
  crawl_source_id: string | null;
  issue_source_id: string | null;
}

export interface NewsFeedPageDto {
  channel: string;
  label: string;
  layout: NewsFeedLayoutDto;
  provider: NewsFeedProviderDto;
  items: NewsFeedItemDto[];
  next_cursor: string | null;
  availability?: "coming_soon" | string;
  message?: string | null;
}

export interface ManagementIdentityDto {
  status: "ready" | "failed" | "pending" | "missing" | string;
  context_version: number | null;
  company_name: string | null;
  lens_summary: string | null;
  fingerprint: string | null;
  error_message: string | null;
  updated_at: string | null;
}

export interface CompanyContextDto {
  context_id: string;
  company_id: string;
  version: number;
  status: string;
  source: unknown;
  draft_id: string | null;
  fields: Record<string, unknown>;
  field_sources?: Array<{ field: string; source_locator: string }>;
  field_review?: Record<string, string> | null;
  missing_fields?: string[];
  completeness?: CompanyContextCompletenessDto | null;
  change_reason: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  management_identity?: ManagementIdentityDto | null;
}

export interface CompanyContextCompletenessDto {
  status: string;
  complete: boolean;
  blocking: boolean;
  rule_version: string;
  core_fields: string[];
  recommended_fields: string[];
  missing_core_fields: string[];
  missing_recommended_fields: string[];
  field_status?: Array<{ field: string; label: string; level: string; present: boolean }>;
  required_fields?: string[];
  ai_review_fields?: string[];
  optional_fields?: string[];
  missing_required_fields?: string[];
  pending_review_fields?: string[];
  field_review?: Record<string, string>;
}

export interface AlertPreferenceDto {
  recipient_id: string;
  direct_high_enabled: boolean;
  daily_digest_enabled: boolean;
  timezone: string;
  quiet_hours: { start: string; end: string } | null;
}

export interface LanguagePreferenceDto {
  language: CompanyLanguage;
}

export interface NewsIntakeAutomaticDto {
  desired: boolean;
  actual_running: boolean;
  enabled: boolean;
  running: boolean;
  interval_ms: number | null;
  batch_size: number | null;
  locales: string[];
  last_enqueue_at: string | null;
  last_enqueue_status: string | null;
  last_error_code: string | null;
  last_job_id: string | null;
  desired_source: string | null;
  desired_updated_at: string | null;
}

export interface NewsIntakeStatusDto {
  automatic_intake: NewsIntakeAutomaticDto;
  workers: { enabled: boolean; running: boolean };
  pipeline: { configured: boolean };
  intake_ready?: boolean;
  management_identity?: {
    ready: boolean;
    status: string;
    context_version: number | null;
    has_effective_context: boolean;
  };
  company_context?: {
    complete: boolean;
    status: string;
    rule_version: string | null;
    missing_core_fields: string[];
    missing_recommended_fields: string[];
  };
}

export type NewsIntakePullMode = "poll" | "crawl-poll" | "article";

export interface NewsIntakePullRequest {
  mode: NewsIntakePullMode;
  locale: "id" | "en" | "uz";
  limit: number;
  crawl_source_id?: string;
  article_id?: string;
}

export interface NewsIntakePullResultDto {
  id: string;
  action: string;
  state: string;
  reused: boolean;
  locale: string;
  stages: Array<{ name: string; state: string; updated_at: string }>;
}

export interface NewsIntakeRunDto {
  id: string;
  when: string | null;
  source: string | null;
  mode: string | null;
  action: string | null;
  state: string;
  locale: string | null;
  crawl_source_id: string | null;
  job_type: string | null;
  family: "intake" | "ai_task" | string;
  reused: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface NewsIntakeRunsPageDto {
  items: NewsIntakeRunDto[];
  limit: number;
  offset: number;
  has_more: boolean;
  next_offset: number | null;
  next_cursor: string | null;
}

export interface SavedIssueDto { saved_id: string; issue_id: string; saved_at: string; issue: IssueCardDto; }
export interface SavedIssueListDto { items: SavedIssueDto[]; meta: PaginationMeta; }
export interface InboxEmailDto { email_id: string; issue_id: string | null; development_id: string | null; channel: "langsung" | "ringkasan" | string; status: string; reason_code: string | null; read: boolean; created_at: string; }
export interface InboxEmailListDto { items: InboxEmailDto[]; meta: PaginationMeta; }
export type ReportReviewStatus = "draft" | "in_review" | "approved" | "shared" | "needs_review";
export interface ReportDto { report_id: string; report_type: "harian" | "mingguan" | "bulanan"; period_start: string; period_end: string; timezone: string; context_version: number; metrics: Record<string, unknown>; selected_issue_pack: unknown[]; review_status: ReportReviewStatus; version: number; created_at: string; updated_at: string; }
export interface ReportListDto { items: ReportDto[]; meta: PaginationMeta; }
export interface ReportDetailDto { report: ReportDto; narrative: Record<string, unknown> | null; activity: Array<Record<string, unknown>>; }
