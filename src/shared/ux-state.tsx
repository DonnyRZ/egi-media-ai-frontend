"use client";

import { isAxiosError } from "axios";
import { useState, type ReactNode } from "react";
import { AlertCircle, Ban, ChevronLeft, ChevronRight, Clock, GitCompareArrows, Hourglass, Inbox, LoaderCircle, LogIn, RefreshCw, WifiOff, type LucideIcon } from "lucide-react";

export type StandardStateKind = "loading" | "empty" | "error" | "unauthorized" | "forbidden" | "conflict" | "stale" | "provider" | "offline" | "timeout";

export interface StandardErrorState {
  kind: Exclude<StandardStateKind, "loading" | "empty">;
  code: string;
  message: string;
  retryable: boolean;
}

export function classifyApiError(error: unknown): StandardErrorState {
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  if (offline) return { kind: "offline", code: "OFFLINE", message: "You appear to be offline. Check your connection and try again.", retryable: true };
  if (isAxiosError<{ error?: { code?: string; message?: string }; meta?: { retryable?: boolean } }>(error)) {
    const code = error.response?.data?.error?.code ?? error.code ?? "REQUEST_FAILED";
    const message = error.response?.data?.error?.message ?? "The request could not be completed.";
    const kind = stateKindForCode(code, error.code);
    return { kind, code, message, retryable: Boolean(error.response?.data?.meta?.retryable) || ["offline", "timeout", "provider"].includes(kind) };
  }
  return { kind: "error", code: "REQUEST_FAILED", message: "The request could not be completed.", retryable: false };
}

function stateKindForCode(code: string, transportCode?: string): StandardErrorState["kind"] {
  if (transportCode === "ECONNABORTED" || transportCode === "ETIMEDOUT") return "timeout";
  if (["UNAUTHORIZED", "AUTHENTICATION_REQUIRED"].includes(code)) return "unauthorized";
  if (["FORBIDDEN", "SCOPE_CONTEXT_UNTRUSTED"].includes(code)) return "forbidden";
  if (["VERSION_CONFLICT", "CONFLICT"].includes(code)) return "conflict";
  if (["STALE_DATA", "STALE_ANALYSIS"].includes(code)) return "stale";
  if (code.startsWith("AI_PROVIDER_") || code.startsWith("AI_OUTPUT_")) return "provider";
  if (code === "NETWORK_ERROR") return "offline";
  return "error";
}

export function StandardState({ kind, title, message, onRetry, retryLabel = "Try again", children }: { kind: StandardStateKind; title?: string; message?: string; onRetry?: () => void | Promise<unknown>; retryLabel?: string; children?: ReactNode }) {
  const [retrying, setRetrying] = useState(false);
  async function retry() {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }
  if (kind === "loading") return <div className="standard-state standard-state-loading" aria-busy="true" aria-live="polite"><div className="loading-brand"><div className="brand-mark">E</div><div><strong>EGI Media</strong><span>AI Intelligence</span></div></div><div className="standard-loader" /><span>{message ?? "Loading workspace..."}</span>{children}</div>;
  if (kind === "empty") return <div className="standard-state standard-state-empty"><div className="standard-state-mark"><Inbox size={20} strokeWidth={2} aria-hidden="true" /></div><h2>{title ?? "Nothing here yet"}</h2><p>{message ?? "There is no data to show."}</p>{children}</div>;
  const copy = stateCopy(kind);
  const Mark = copy.mark;
  return <div className={`standard-state standard-state-${kind}`} role="alert"><div className="standard-state-mark"><Mark size={20} strokeWidth={2} aria-hidden="true" /></div><span className="standard-state-eyebrow">{copy.eyebrow}</span><h2>{title ?? copy.title}</h2><p>{message ?? copy.message}</p>{onRetry && <button className="context-action" aria-busy={retrying} data-loading={retrying} disabled={retrying} onClick={() => void retry()}>{retrying ? <BusyLabel>Retrying…</BusyLabel> : retryLabel}</button>}{children}</div>;
}

function stateCopy(kind: Exclude<StandardStateKind, "loading" | "empty">) {
  const copy: Record<Exclude<StandardStateKind, "loading" | "empty">, readonly [string, string, LucideIcon]> = { error: ["Error", "Something went wrong.", AlertCircle], unauthorized: ["Sign in required", "Your session is not authorized.", LogIn], forbidden: ["Access restricted", "You do not have permission for this scope.", Ban], conflict: ["Version conflict", "This data changed while you were working.", GitCompareArrows], stale: ["Stale data", "This view needs a fresh backend read.", Clock], provider: ["Provider unavailable", "The AI provider could not complete this operation.", RefreshCw], offline: ["Offline", "Reconnect to continue.", WifiOff], timeout: ["Request timed out", "The backend took too long to respond.", Hourglass] };
  const [eyebrow, title, mark] = copy[kind];
  return { eyebrow, title, message: kind === "provider" ? "No unvalidated AI output was applied." : title, mark };
}

export function StandardSkeleton({ rows = 4 }: { rows?: number }) { return <div className="standard-skeleton" aria-hidden="true">{Array.from({ length: rows }, (_, index) => <span key={index} />)}</div>; }

export function BusyLabel({ children }: { children: ReactNode }) {
  return <span className="busy-label"><LoaderCircle className="button-spinner" size={15} strokeWidth={2.2} aria-hidden="true" /><span>{children}</span></span>;
}

export function InlineLoading({ label }: { label: string }) {
  return <span className="inline-loading" aria-live="polite"><LoaderCircle className="inline-loading-spinner" size={15} strokeWidth={2.2} aria-hidden="true" /><span>{label}</span></span>;
}

export function CollectionLoading({ label, rows = 4, className = "" }: { label: string; rows?: number; className?: string }) {
  return (
    <div className={`collection-loading ${className}`.trim()} aria-busy="true" aria-live="polite">
      <div className="collection-loading-status"><span className="collection-loading-icon"><LoaderCircle className="collection-loading-spinner" size={19} strokeWidth={2.1} aria-hidden="true" /></span><div><strong>{label}</strong><span>Preparing the latest data for this view.</span></div></div>
      <div className="collection-loading-list" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => <div className="collection-loading-row" key={index}><span /><span /><span /><i /></div>)}
      </div>
    </div>
  );
}

export function CollectionEmptyState({
  title,
  message,
  icon: Icon = Inbox,
  tone = "default",
  children,
}: {
  title: string;
  message: string;
  icon?: LucideIcon;
  tone?: "default" | "error";
  children?: ReactNode;
}) {
  return (
    <div className={`issues-empty ${tone === "error" ? "is-error" : ""}`.trim()} role={tone === "error" ? "alert" : undefined}>
      <span className="issues-empty-mark" aria-hidden="true"><Icon size={20} strokeWidth={2} /></span>
      <h2>{title}</h2>
      <p>{message}</p>
      {children}
    </div>
  );
}

export function CollectionPagination({
  page,
  total,
  limit,
  onPageChange,
  isFetching = false,
  label = "items",
}: {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  isFetching?: boolean;
  label?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  if (total <= 0 || pageCount <= 1) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return (
    <nav className="collection-pagination" aria-label={`${label} pagination`} aria-busy={isFetching}>
      <span className="collection-pagination-range" aria-live="polite">Showing {start}-{end} of {total} {label}</span>
      <div className="collection-pagination-controls">
        <button
          type="button"
          className="source-preview-button"
          aria-label="Previous page"
          disabled={page <= 1 || isFetching}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
          <span>Previous</span>
        </button>
        <span className="collection-pagination-page" aria-live="polite">Page {page} of {pageCount}</span>
        <button
          type="button"
          className="source-preview-button"
          aria-label="Next page"
          disabled={page >= pageCount || isFetching}
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
        >
          <span>Next</span>
          <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

export function RouteLoading() {
  return (
    <div className="route-loading route-loading-inline" role="status" aria-busy="true" aria-label="Loading workspace view" data-testid="route-loading">
      <div className="route-nav-progress" aria-hidden="true" />
      <div className="route-loading-bar" aria-hidden="true" />
      <div className="route-loading-title" aria-hidden="true" />
      <div className="route-loading-copy" aria-hidden="true" />
      <div className="route-loading-grid" aria-hidden="true"><span /><span /><span /></div>
    </div>
  );
}
