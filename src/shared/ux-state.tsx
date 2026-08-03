"use client";

import { isAxiosError } from "axios";
import type { ReactNode } from "react";
import { AlertCircle, Ban, Clock, GitCompareArrows, Hourglass, Inbox, LogIn, RefreshCw, WifiOff, type LucideIcon } from "lucide-react";

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

export function StandardState({ kind, title, message, onRetry, retryLabel = "Try again", children }: { kind: StandardStateKind; title?: string; message?: string; onRetry?: () => void; retryLabel?: string; children?: ReactNode }) {
  if (kind === "loading") return <div className="standard-state standard-state-loading" aria-busy="true" aria-live="polite"><div className="loading-brand"><div className="brand-mark">E</div><div><strong>EGI Media</strong><span>AI Intelligence</span></div></div><div className="standard-loader" /><span>{message ?? "Loading workspace..."}</span>{children}</div>;
  if (kind === "empty") return <div className="standard-state standard-state-empty"><div className="standard-state-mark"><Inbox size={20} strokeWidth={2} aria-hidden="true" /></div><h2>{title ?? "Nothing here yet"}</h2><p>{message ?? "There is no data to show."}</p>{children}</div>;
  const copy = stateCopy(kind);
  const Mark = copy.mark;
  return <div className={`standard-state standard-state-${kind}`} role="alert"><div className="standard-state-mark"><Mark size={20} strokeWidth={2} aria-hidden="true" /></div><span className="standard-state-eyebrow">{copy.eyebrow}</span><h2>{title ?? copy.title}</h2><p>{message ?? copy.message}</p>{onRetry && <button className="context-action" onClick={onRetry}>{retryLabel}</button>}{children}</div>;
}

function stateCopy(kind: Exclude<StandardStateKind, "loading" | "empty">) {
  const copy: Record<Exclude<StandardStateKind, "loading" | "empty">, readonly [string, string, LucideIcon]> = { error: ["Error", "Something went wrong.", AlertCircle], unauthorized: ["Sign in required", "Your session is not authorized.", LogIn], forbidden: ["Access restricted", "You do not have permission for this scope.", Ban], conflict: ["Version conflict", "This data changed while you were working.", GitCompareArrows], stale: ["Stale data", "This view needs a fresh backend read.", Clock], provider: ["Provider unavailable", "The AI provider could not complete this operation.", RefreshCw], offline: ["Offline", "Reconnect to continue.", WifiOff], timeout: ["Request timed out", "The backend took too long to respond.", Hourglass] };
  const [eyebrow, title, mark] = copy[kind];
  return { eyebrow, title, message: kind === "provider" ? "No unvalidated AI output was applied." : title, mark };
}

export function StandardSkeleton({ rows = 4 }: { rows?: number }) { return <div className="standard-skeleton" aria-hidden="true">{Array.from({ length: rows }, (_, index) => <span key={index} />)}</div>; }
