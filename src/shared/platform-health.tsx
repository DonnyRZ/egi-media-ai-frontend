"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, CheckCircle2, CircleAlert, LoaderCircle, RefreshCw } from "lucide-react";
import { isAxiosError } from "axios";

import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import type { ApiSuccessResponse } from "@/shared/types/api.types";
import { useSessionStore } from "@/shared/session-store";
import { BusyLabel } from "@/shared/ux-state";

type HealthPayload = {
  service: string;
  status: "ready" | "degraded";
  environment: string;
  checked_at: string;
  checks: Record<string, string>;
  metrics?: { counters?: Array<{ name: string; value: number }>; histograms?: Array<{ name: string; count: number }> };
};

async function readHealth() {
  const response = await axiosClient.get<ApiSuccessResponse<HealthPayload>>(API_ENDPOINTS.platformHealth);
  return response.data.data;
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function checkTone(value: string) {
  return ["ok", "ready", "configured", "postgres", "memory"].includes(value) ? "ready" : value === "not_configured" ? "neutral" : "attention";
}

export function PlatformHealth() {
  const canManagePlatform = useSessionStore((state) => state.permissions.includes("platform.tenants.manage"));
  const query = useQuery({ queryKey: ["platform-health"], queryFn: readHealth, enabled: canManagePlatform, staleTime: 15_000, refetchInterval: 30_000, retry: 1 });

  if (!canManagePlatform) return <div className="standard-state standard-state-forbidden"><h2>System health restricted</h2><p>Platform health checks are available only to platform administrators.</p></div>;

  if (query.isLoading) return <HealthState title="Checking system health" message="Reading the control plane status." loading />;
  if (query.isError || !query.data) {
    const message = isAxiosError<{ error?: { message?: string } }>(query.error) ? query.error.response?.data?.error?.message || "The health service could not be reached." : "The health service could not be reached.";
    return <HealthState title="System health unavailable" message={message} onRetry={() => void query.refetch()} />;
  }

  const health = query.data;
  const requestCount = health.metrics?.counters?.filter((item) => item.name === "http_requests_total").reduce((sum, item) => sum + item.value, 0) ?? 0;

  return (
    <div className="platform-ops-page">
      <section className="platform-ops-summary" aria-label="System health summary">
        <div className="platform-ops-summary-card"><span>Service</span><strong>{health.service}</strong></div>
        <div className="platform-ops-summary-card"><span>Environment</span><strong>{health.environment}</strong></div>
        <div className="platform-ops-summary-card"><span>Requests observed</span><strong>{requestCount.toLocaleString()}</strong></div>
      </section>

       <section className="platform-ops-section" aria-labelledby="health-checks-heading">
        <div className="platform-ops-section-header"><div><p className="platform-section-kicker">Checks</p><h2 id="health-checks-heading">Runtime components</h2></div><button className="platform-secondary-button" aria-busy={query.isFetching} disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? <LoaderCircle className="button-spinner" size={15} aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />} {query.isFetching ? "Refreshing..." : "Refresh"}</button></div>
        <div className="platform-check-grid">
          {Object.entries(health.checks).map(([key, value]) => <article className={`platform-check-card is-${checkTone(value)}`} key={key}><div className="platform-check-icon">{checkTone(value) === "attention" ? <CircleAlert size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}</div><div><strong>{label(key)}</strong><span>{label(value)}</span></div></article>)}
        </div>
      </section>

      <section className="platform-ops-section platform-ops-note" aria-label="Health check timestamp"><Activity size={18} aria-hidden="true" /><span>Last checked {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(health.checked_at))}</span></section>
    </div>
  );
}

function HealthState({ title, message, loading = false, onRetry }: { title: string; message: string; loading?: boolean; onRetry?: () => void | Promise<unknown> }) {
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
  return <div className="platform-ops-state" aria-busy={loading || retrying}><div className="platform-ops-state-icon">{loading || retrying ? <LoaderCircle className="platform-loading-icon" size={20} aria-hidden="true" /> : <CircleAlert size={20} aria-hidden="true" />}</div><p className="platform-eyebrow">Platform operations</p><h1>{title}</h1><p>{message}</p>{onRetry && <button type="button" className="platform-primary-button" aria-busy={retrying} data-loading={retrying} disabled={retrying} onClick={() => void retry()}>{retrying ? <BusyLabel>Retrying…</BusyLabel> : "Try again"}</button>}</div>;
}
