"use client";

import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { EXTERNAL_INTAKE_MEDIA } from "@/shared/news-feed-channels";
import { PermissionGate } from "@/shared/permission-guard";
import { ScopeRequired } from "@/shared/prerequisite-gate";
import { useSessionStore } from "@/shared/session-store";
import type {
  ApiSuccessResponse,
  NewsIntakePullRequest,
  NewsIntakePullResultDto,
  NewsIntakeRunDto,
  NewsIntakeRunsPageDto,
  NewsIntakeStatusDto,
} from "@/shared/types/api.types";
import { StandardState } from "@/shared/ux-state";
import { useWorkspaceScope } from "@/shared/workspace-scope";

type PullSourceKind = "egi" | "external" | "article";
type IntakeLocale = "id" | "en" | "uz";

const RUNS_PAGE_SIZE = 15;

function createPullIdempotencyKey() {
  return `news-intake-pull-${crypto.randomUUID()}`;
}

async function readStatus() {
  const response = await axiosClient.get<ApiSuccessResponse<NewsIntakeStatusDto>>(API_ENDPOINTS.newsIntakeStatus);
  return response.data.data;
}

async function setAutomaticDesired(desired: boolean) {
  const response = await axiosClient.post<ApiSuccessResponse<NewsIntakeStatusDto>>(
    API_ENDPOINTS.newsIntakeAutomatic,
    { desired },
  );
  return response.data.data;
}

async function pullArticles(body: NewsIntakePullRequest) {
  const response = await axiosClient.post<ApiSuccessResponse<NewsIntakePullResultDto>>(
    API_ENDPOINTS.newsIntakePull,
    body,
    { headers: { "Idempotency-Key": createPullIdempotencyKey() } },
  );
  return response.data.data;
}

async function readRuns(offset: number) {
  const response = await axiosClient.get<ApiSuccessResponse<NewsIntakeRunsPageDto>>(API_ENDPOINTS.newsIntakeRuns, {
    params: { limit: RUNS_PAGE_SIZE, offset },
  });
  return response.data.data;
}

export function NewsIntake() {
  const scope = useWorkspaceScope();

  return (
    <ScopeRequired
      require="company"
      scope={scope}
      title="Company required for News intake"
      reason="News intake status and pulls are scoped to an active company. Select a company before opening this page."
      nextStep="Pick a company in the header switcher. If none exist, provision one under Platform, then return here."
    >
      <PermissionGate
        permission="news.intake.read"
        fallback={
          <StandardState
            kind="forbidden"
            title="News intake is restricted"
            message="Your role cannot view News intake status or recent runs."
          />
        }
      >
        <NewsIntakeBody />
      </PermissionGate>
    </ScopeRequired>
  );
}

function NewsIntakeBody() {
  const queryClient = useQueryClient();
  const companyId = useSessionStore((state) => state.activeCompanyId);
  const canManage = useSessionStore((state) => state.permissions.includes("news.intake.manage"));
  const canTrigger = useSessionStore((state) => state.permissions.includes("news.intake.trigger"));

  const [pullSource, setPullSource] = useState<PullSourceKind>("egi");
  const [externalMediaId, setExternalMediaId] = useState<string>(EXTERNAL_INTAKE_MEDIA[0]?.id ?? "detik");
  const [articleId, setArticleId] = useState("");
  const [locale, setLocale] = useState<IntakeLocale>("id");
  const [limit, setLimit] = useState(20);
  const [runsOffset, setRunsOffset] = useState(0);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const statusQuery = useQuery({
    queryKey: ["news-intake-status", companyId],
    queryFn: readStatus,
    enabled: Boolean(companyId),
    retry: false,
    staleTime: 15_000,
  });

  const runsQuery = useQuery({
    queryKey: ["news-intake-runs", companyId, runsOffset],
    queryFn: () => readRuns(runsOffset),
    enabled: Boolean(companyId),
    retry: false,
    staleTime: 10_000,
  });

  const automaticMutation = useMutation({
    mutationFn: (desired: boolean) => setAutomaticDesired(desired),
    onSuccess: (data) => {
      queryClient.setQueryData(["news-intake-status", companyId], data);
      setNotice({
        kind: "success",
        text: data.automatic_intake.desired
          ? "Automatic intake is on. Eligible companies will receive scheduled EGI Media pulls."
          : "Automatic intake is off. Manual pulls still work when you need them.",
      });
    },
    onError: (error) => setNotice({ kind: "error", text: newsIntakeError(error, "automatic") }),
  });

  const pullMutation = useMutation({
    mutationFn: () => {
      const body = buildPullBody({ pullSource, externalMediaId, articleId, locale, limit });
      return pullArticles(body);
    },
    onSuccess: (data) => {
      setNotice({
        kind: "success",
        text: data.reused
          ? `Pull already queued (${data.state}). Check Recent runs for progress.`
          : `Pull accepted (${data.state}). Check Recent runs for progress.`,
      });
      setRunsOffset(0);
      void queryClient.invalidateQueries({ queryKey: ["news-intake-runs", companyId] });
    },
    onError: (error) => setNotice({ kind: "error", text: newsIntakeError(error, "pull") }),
  });

  const automatic = statusQuery.data?.automatic_intake;
  const desiredOn = Boolean(automatic?.desired);
  const statusLine = useMemo(() => formatAutomaticStatus(automatic), [automatic]);
  const pullValid = isPullFormValid({ pullSource, externalMediaId, articleId, limit });
  const isIntakeReady = (() => {
    const status = statusQuery.data;
    if (!status) return true;
    if (typeof status.intake_ready === "boolean") return status.intake_ready;
    if (status.management_identity) return Boolean(status.management_identity.ready);
    return true;
  })();
  const identityStatus = statusQuery.data?.management_identity?.status ?? null;
  const pullDisabled =
    !canTrigger || !pullValid || pullMutation.isPending || statusQuery.isError || !isIntakeReady;
  const automaticDisabled =
    !canManage || automaticMutation.isPending || statusQuery.isPending || statusQuery.isError || !isIntakeReady;
  const runsPage = runsQuery.data;
  const runsHasMore = Boolean(runsPage?.has_more);
  const runsPageNumber = Math.floor(runsOffset / RUNS_PAGE_SIZE) + 1;

  return (
    <div className="preference-page news-intake-page" data-testid="news-intake-page">
      <header className="news-intake-intro">
        <p>
          Bring articles into issues for this company. Automatic intake covers EGI Media on a schedule; manual pulls
          cover one source at a time.
        </p>
      </header>

      {statusQuery.isError && (
        <div className="preference-notice error" role="alert" data-testid="news-intake-status-error">
          {newsIntakeError(statusQuery.error, "status")}
          <button
            type="button"
            className="context-action"
            onClick={() => {
              setNotice(null);
              void statusQuery.refetch();
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!statusQuery.isError && statusQuery.data && !isIntakeReady && (
        <div className="preference-notice error" role="alert" data-testid="news-intake-identity-block">
          Management identity must be ready before Pull or automatic intake
          {identityStatus ? ` (status: ${identityStatus})` : ""}. Open Company Context to retry identity or revise the
          approved context.
        </div>
      )}

      <section className="news-intake-section" data-testid="news-intake-automatic">
        <div className="news-intake-section-head news-intake-section-head-row">
          <div>
            <span className="context-label">Settings</span>
            <h2>Automatic intake</h2>
            <p>
              When on, the system periodically pulls recent EGI Media articles for eligible companies. Turning this off
              stops new scheduled pulls; it does not stop work already in progress.
            </p>
            <p className="news-intake-status-line" data-testid="news-intake-automatic-status">
              {statusQuery.isPending ? "Loading status…" : statusLine}
            </p>
            {!canManage && (
              <p className="news-intake-permission-note">Your role can view this setting but cannot change it.</p>
            )}
            {canManage && !isIntakeReady && (
              <p className="news-intake-permission-note" data-testid="news-intake-automatic-blocked-note">
                Automatic intake stays off until management identity is ready.
              </p>
            )}
          </div>
          <button
            className={`toggle ${desiredOn ? "is-on" : ""}`}
            role="switch"
            aria-checked={desiredOn}
            aria-label="Automatic intake"
            data-testid="news-intake-automatic-switch"
            disabled={automaticDisabled}
            onClick={() => {
              if (automaticDisabled) return;
              setNotice(null);
              automaticMutation.mutate(!desiredOn);
            }}
          >
            <span />
          </button>
        </div>
      </section>

      <section className="news-intake-section" data-testid="news-intake-pull">
        <div className="news-intake-section-head news-intake-section-head-row">
          <div>
            <span className="context-label">Manual</span>
            <h2>Pull articles now</h2>
          </div>
          <span className="preference-readonly">One source per pull</span>
        </div>

        <div className="preference-field news-intake-source-field">
          <span>Source</span>
          <div
            className="source-mode-tabs"
            role="tablist"
            aria-label="Pull source"
            data-testid="news-intake-source-tabs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={pullSource === "egi"}
              className={pullSource === "egi" ? "is-active" : undefined}
              disabled={!canTrigger || pullMutation.isPending}
              onClick={() => {
                setPullSource("egi");
                setNotice(null);
              }}
            >
              EGI Media
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={pullSource === "external"}
              className={pullSource === "external" ? "is-active" : undefined}
              disabled={!canTrigger || pullMutation.isPending}
              onClick={() => {
                setPullSource("external");
                setNotice(null);
              }}
            >
              External media
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={pullSource === "article"}
              className={pullSource === "article" ? "is-active" : undefined}
              disabled={!canTrigger || pullMutation.isPending}
              onClick={() => {
                setPullSource("article");
                setNotice(null);
              }}
            >
              One article
            </button>
          </div>
        </div>

        {pullSource === "external" && (
          <label className="preference-field">
            <span>Media</span>
            <select
              data-testid="news-intake-external-media"
              value={externalMediaId}
              disabled={!canTrigger || pullMutation.isPending}
              onChange={(event) => {
                setExternalMediaId(event.target.value);
                setNotice(null);
              }}
            >
              {EXTERNAL_INTAKE_MEDIA.map((media) => (
                <option key={media.id} value={media.id}>
                  {media.label}
                </option>
              ))}
            </select>
            <small>Pull from exactly one external media outlet. All 17 outlets are listed; choose one.</small>
          </label>
        )}

        {pullSource === "article" && (
          <label className="preference-field">
            <span>Article reference</span>
            <input
              data-testid="news-intake-article-id"
              value={articleId}
              disabled={!canTrigger || pullMutation.isPending}
              onChange={(event) => {
                setArticleId(event.target.value);
                setNotice(null);
              }}
              placeholder="Article id or cms:… / crawl:…"
            />
            <small>Use a published article id. Viral items are not accepted as intake sources.</small>
          </label>
        )}

        <div className="news-intake-pull-grid">
          <label className="preference-field">
            <span>Locale</span>
            <select
              data-testid="news-intake-locale"
              value={locale}
              disabled={!canTrigger || pullMutation.isPending}
              onChange={(event) => {
                setLocale(event.target.value as IntakeLocale);
                setNotice(null);
              }}
            >
              <option value="id">Bahasa Indonesia (id)</option>
              <option value="en">English (en)</option>
              <option value="uz">Uzbek (uz)</option>
            </select>
          </label>
          <label className="preference-field">
            <span>Limit</span>
            <input
              data-testid="news-intake-limit"
              type="number"
              min={1}
              max={100}
              value={limit}
              disabled={!canTrigger || pullMutation.isPending || pullSource === "article"}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setNotice(null);
              }}
            />
            <small>1–100 articles per pull.</small>
          </label>
        </div>

        <p className="news-intake-cost-note">
          Pulling articles may use AI processing capacity. Prefer a lower limit when testing.
        </p>
        <p className="news-intake-honesty-note">
          After articles are accepted, AI analysis may run for all eligible companies with Company Context — not only
          this company.
        </p>

        {!canTrigger && (
          <p className="news-intake-permission-note">Your role cannot pull articles.</p>
        )}
        {canTrigger && !isIntakeReady && (
          <p className="news-intake-permission-note" data-testid="news-intake-pull-blocked-note">
            Pull is disabled until management identity is ready for this company.
          </p>
        )}

        <div className="preference-footer">
          <div className="preference-failclosed">
            <strong>Bounded pull</strong>
            <span>Each request pulls one source only. External media never fans out to all outlets at once.</span>
          </div>
          <button
            className="context-action"
            data-testid="news-intake-pull-now"
            disabled={pullDisabled}
            onClick={() => {
              setNotice(null);
              pullMutation.mutate();
            }}
          >
            {pullMutation.isPending ? "Pulling…" : "Pull now"}
          </button>
        </div>
      </section>

      <section className="news-intake-section news-intake-runs" data-testid="news-intake-runs">
        <div className="news-intake-section-head news-intake-section-head-row">
          <div>
            <span className="context-label">History</span>
            <h2>Recent runs</h2>
            <p className="news-intake-runs-subtitle">Newest first · {RUNS_PAGE_SIZE} per page</p>
          </div>
          <button
            type="button"
            className="news-intake-refresh"
            data-testid="news-intake-runs-refresh"
            disabled={runsQuery.isFetching}
            onClick={() => void runsQuery.refetch()}
          >
            <RefreshCw size={14} strokeWidth={2} aria-hidden="true" />
            {runsQuery.isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {runsQuery.isPending && <p className="news-intake-runs-empty">Loading recent runs…</p>}
        {runsQuery.isError && (
          <div className="preference-notice error" role="alert" data-testid="news-intake-runs-error">
            {newsIntakeError(runsQuery.error, "runs")}
            <button type="button" className="context-action" onClick={() => void runsQuery.refetch()}>
              Retry
            </button>
          </div>
        )}
        {!runsQuery.isPending && !runsQuery.isError && (runsPage?.items.length ?? 0) === 0 && (
          <p className="news-intake-runs-empty" data-testid="news-intake-runs-empty">
            No recent runs for this company yet.
          </p>
        )}
        {(runsPage?.items.length ?? 0) > 0 && (
          <>
            <div className="news-intake-runs-table-wrap">
              <table className="news-intake-runs-table" data-testid="news-intake-runs-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Source</th>
                    <th>Action</th>
                    <th>State</th>
                    <th>Locale</th>
                  </tr>
                </thead>
                <tbody>
                  {runsPage!.items.map((run) => (
                    <tr key={run.id}>
                      <td>{formatWhen(run.when ?? run.created_at)}</td>
                      <td>{formatRunSource(run)}</td>
                      <td>{formatRunAction(run)}</td>
                      <td>{humanState(run.state)}</td>
                      <td>{run.locale ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="news-intake-runs-pager" data-testid="news-intake-runs-pager">
              <button
                type="button"
                className="news-intake-pager-btn"
                data-testid="news-intake-runs-prev"
                disabled={runsOffset <= 0 || runsQuery.isFetching}
                onClick={() => setRunsOffset((current) => Math.max(0, current - RUNS_PAGE_SIZE))}
              >
                Previous
              </button>
              <span className="news-intake-pager-meta" data-testid="news-intake-runs-page-label">
                Page {runsPageNumber}
              </span>
              <button
                type="button"
                className="news-intake-pager-btn"
                data-testid="news-intake-runs-next"
                disabled={!runsHasMore || runsQuery.isFetching}
                onClick={() => {
                  const next = runsPage?.next_offset;
                  if (typeof next === "number") setRunsOffset(next);
                  else setRunsOffset((current) => current + RUNS_PAGE_SIZE);
                }}
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>

      {notice && (
        <div className={`preference-notice ${notice.kind}`} role="status" data-testid="news-intake-notice">
          {notice.text}
        </div>
      )}
    </div>
  );
}

function buildPullBody({
  pullSource,
  externalMediaId,
  articleId,
  locale,
  limit,
}: {
  pullSource: PullSourceKind;
  externalMediaId: string;
  articleId: string;
  locale: IntakeLocale;
  limit: number;
}): NewsIntakePullRequest {
  if (pullSource === "egi") {
    return { mode: "poll", locale, limit };
  }
  if (pullSource === "external") {
    return { mode: "crawl-poll", locale, limit, crawl_source_id: externalMediaId };
  }
  return { mode: "article", locale, limit: Math.min(Math.max(limit, 1), 100), article_id: articleId.trim() };
}

function isPullFormValid({
  pullSource,
  externalMediaId,
  articleId,
  limit,
}: {
  pullSource: PullSourceKind;
  externalMediaId: string;
  articleId: string;
  limit: number;
}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return false;
  if (pullSource === "external" && !EXTERNAL_INTAKE_MEDIA.some((media) => media.id === externalMediaId)) return false;
  if (pullSource === "article" && articleId.trim().length < 1) return false;
  return true;
}

function formatAutomaticStatus(automatic: NewsIntakeStatusDto["automatic_intake"] | undefined) {
  if (!automatic) return "Status unavailable.";
  const desired = automatic.desired ? "On" : "Off";
  const running = automatic.actual_running ? "running" : "not running";
  const interval = formatInterval(automatic.interval_ms);
  const batch =
    typeof automatic.batch_size === "number" && automatic.batch_size > 0
      ? `up to ${automatic.batch_size} articles per cycle`
      : "batch size not reported";
  return `${desired} · ${running} · ${interval} · ${batch}`;
}

function formatInterval(ms: number | null | undefined) {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return "interval not reported";
  if (ms < 60_000) return `every ${Math.max(1, Math.round(ms / 1000))} seconds`;
  if (ms < 3_600_000) return `every ${Math.max(1, Math.round(ms / 60_000))} minutes`;
  return `every ${Math.max(1, Math.round(ms / 3_600_000))} hours`;
}

function formatWhen(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRunSource(run: NewsIntakeRunDto) {
  if (run.crawl_source_id) {
    const media = EXTERNAL_INTAKE_MEDIA.find((item) => item.id === run.crawl_source_id);
    return media?.label ?? run.crawl_source_id;
  }
  if (run.source === "egi-media-cms" || run.mode === "poll" || run.mode === "article" || run.action === "poll" || run.action === "article") {
    return "EGI Media";
  }
  return run.source ?? "—";
}

function formatRunAction(run: NewsIntakeRunDto) {
  const mode = run.action || run.mode;
  if (mode === "poll") return "EGI Media pull";
  if (mode === "crawl-poll") return "External media pull";
  if (mode === "article") return "One article";
  return mode ?? "—";
}

function humanState(state: string) {
  if (!state) return "—";
  return state.replaceAll("_", " ");
}

function newsIntakeError(error: unknown, surface: "status" | "automatic" | "pull" | "runs") {
  if (error instanceof Error && !isAxiosError(error)) return error.message;
  if (isAxiosError<{ error?: { code?: string; message?: string } }>(error)) {
    const code = error.response?.data?.error?.code;
    if (code === "UNAUTHORIZED" || code === "FORBIDDEN") {
      if (surface === "automatic") return "Your role cannot change Automatic intake.";
      if (surface === "pull") return "Your role cannot pull articles.";
      return "Your session is not authorized for News intake.";
    }
    if (code === "MANAGEMENT_IDENTITY_REQUIRED") {
      return (
        error.response?.data?.error?.message ??
        "Management identity must be ready before Pull or automatic intake. Open Company Context to retry identity."
      );
    }
    if (code === "VALIDATION_ERROR") {
      return error.response?.data?.error?.message ?? "Check the fields and try again.";
    }
    if (code === "SERVICE_UNAVAILABLE") {
      return "News intake is temporarily unavailable. Try again shortly.";
    }
    return error.response?.data?.error?.message ?? "The backend could not complete this News intake request.";
  }
  return "The backend could not complete this News intake request.";
}
