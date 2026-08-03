"use client";

import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Link } from "@/i18n/navigation";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { mapCompanyContext } from "@/shared/api-mappers";
import { ScopeRequired } from "@/shared/prerequisite-gate";
import { useSessionStore } from "@/shared/session-store";
import { useWorkspaceScope } from "@/shared/workspace-scope";
import type { ApiSuccessResponse, CompanyContextDto, ManagementIdentityDto } from "@/shared/types/api.types";

async function fetchCompanyContext(companyId: string) {
  const response = await axiosClient.get<ApiSuccessResponse<CompanyContextDto>>(API_ENDPOINTS.companyContext(companyId));
  return mapCompanyContext(response.data.data);
}

async function retryManagementIdentity(companyId: string) {
  const response = await axiosClient.post<ApiSuccessResponse<{ management_identity: ManagementIdentityDto }>>(
    API_ENDPOINTS.companyContextIdentityRetry(companyId),
    {},
    { headers: { "Idempotency-Key": `company-context-identity-retry-${crypto.randomUUID()}` } },
  );
  return response.data.data.management_identity;
}

function getApiError(error: unknown) {
  if (isAxiosError<{ error?: { code?: string; message?: string } }>(error)) {
    return { code: error.response?.data?.error?.code ?? "NETWORK_ERROR", message: error.response?.data?.error?.message ?? "The workspace could not be reached." };
  }
  return { code: "UNKNOWN_ERROR", message: "The workspace could not be loaded." };
}

export function CompanyContextRead() {
  const scope = useWorkspaceScope();
  const companyId = scope.activeCompanyId;
  const query = useQuery({
    queryKey: ["company-context", companyId],
    queryFn: () => fetchCompanyContext(companyId as string),
    enabled: Boolean(companyId),
    staleTime: 60_000,
    retry: (failureCount, error) => {
      const code = getApiError(error).code;
      return failureCount < 1 && ["NETWORK_ERROR", "DATABASE_UNAVAILABLE"].includes(code);
    },
  });

  return (
    <ScopeRequired
      require="company"
      scope={scope}
      title="Company required for company context"
      reason="Effective company context is scoped to an active company. Select a company before viewing it."
      nextStep="Pick a company in the header switcher. If none exist, provision one under Platform, then return here."
    >
      <CompanyContextBody
        companyId={companyId as string}
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        data={query.data}
        onRetry={() => {
          void query.refetch();
        }}
      />
    </ScopeRequired>
  );
}

function CompanyContextBody({
  companyId,
  isLoading,
  isError,
  error,
  data,
  onRetry,
}: {
  companyId: string;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  data: Awaited<ReturnType<typeof mapCompanyContext>> | undefined;
  onRetry: () => void;
}) {
  const queryClient = useQueryClient();
  const canApprove = useSessionStore((state) => state.permissions.includes("company_context.approve"));
  const canDraft = useSessionStore((state) => state.permissions.includes("company_context.draft"));
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const retryIdentityMutation = useMutation({
    mutationFn: () => retryManagementIdentity(companyId),
    onSuccess: (identity) => {
      setNotice({
        kind: identity.status === "ready" ? "success" : "error",
        text:
          identity.status === "ready"
            ? "Management identity is ready. Manual Pull and automatic intake can run."
            : `Management identity is still ${identity.status}. ${identity.error_message ?? "Retry again or revise the company context."}`,
      });
      void queryClient.invalidateQueries({ queryKey: ["company-context", companyId] });
      void queryClient.invalidateQueries({ queryKey: ["news-intake-status", companyId] });
    },
    onError: (err) => setNotice({ kind: "error", text: getApiError(err).message }),
  });

  if (isLoading) return <ContextLoading />;
  if (isError) {
    const apiError = getApiError(error);
    if (apiError.code === "NOT_FOUND") {
      const message = canApprove
        ? "Create and approve a context before this workspace can rank leadership-relevant signals."
        : canDraft
          ? "Create a context draft and submit it for approval before this workspace can rank leadership-relevant signals."
          : "No approved context is available for this company yet. Ask a company administrator to set it up.";
      return <ContextState eyebrow="Company intelligence" title="No approved context yet" message={message} action={canDraft || canApprove ? "Create context" : undefined} />;
    }
    if (apiError.code === "UNAUTHORIZED" || apiError.code === "FORBIDDEN") return <ContextState eyebrow="Access restricted" title="You cannot view this context" message="Your current session is not authorized for this company scope." />;
    if (apiError.code === "VERSION_CONFLICT") return <ContextState eyebrow="Stale version" title="This context needs to be refreshed" message="The context version changed while this workspace was open. Reload before continuing." action="Reload context" onAction={onRetry} />;
    return <ContextState eyebrow="Could not load" title="Company context is temporarily unavailable" message={apiError.message} action="Try again" onAction={onRetry} />;
  }
  if (!data) return <ContextState title="No context data" message="The backend returned an empty context response." />;

  const context = data;
  const companyName = readField(context.fields, ["company_name", "companyName", "name"]) ?? "Company name pending";
  const industry = readField(context.fields, ["industry", "sector"]) ?? "Industry pending";
  const updated = formatDate(context.updatedAt);
  const identityStatus = context.managementIdentity?.status ?? "missing";
  const identityReady = identityStatus === "ready";
  const identityFailed = identityStatus === "failed";
  const busy = retryIdentityMutation.isPending;

  return (
    <div className="context-page" data-testid="company-context-read">
      <div className="context-page-heading">
        <span className="context-status-badge">{context.status}</span>
      </div>

      <section className="context-identity-banner" data-testid="company-context-identity" data-status={identityStatus}>
        <div>
          <span className="context-label">Management identity</span>
          <h2>
            <span className={`context-identity-badge is-${identityStatus}`} data-testid="company-context-identity-badge">
              {identityStatus}
            </span>
          </h2>
          {!identityReady && (
            <p>
              {identityFailed
                ? context.managementIdentity?.errorMessage ||
                  "Identity draft failed. Retry identity, or revise company context and approve again."
                : "News intake is blocked until management identity is ready for this context version."}
            </p>
          )}
        </div>
        {(canApprove || canDraft) && (
          <div className="context-lifecycle-actions">
            {canApprove && (identityFailed || identityStatus === "missing" || identityStatus === "pending") && (
              <button
                type="button"
                className="context-action"
                data-testid="company-context-retry-identity"
                disabled={busy}
                onClick={() => {
                  setNotice(null);
                  retryIdentityMutation.mutate();
                }}
              >
                {retryIdentityMutation.isPending ? "Retrying identity…" : "Retry identity"}
              </button>
            )}
            {canDraft && (
              <Link className="context-action context-action-secondary" href="/settings/company-context/draft" data-testid="company-context-revise">
                Revise
              </Link>
            )}
            <Link className="context-action context-action-secondary" href="/settings/company-context/versions" data-testid="company-context-manage-versions">
              Manage versions
            </Link>
          </div>
        )}
      </section>

      {notice && (
        <div className={`preference-notice ${notice.kind}`} role="status" data-testid="company-context-notice">
          {notice.text}
        </div>
      )}

      <section className="context-hero-card">
        <div className="context-company-mark">{companyName.slice(0, 1).toUpperCase()}</div>
        <div>
          <span className="context-label">Effective company</span>
          <h2>{companyName}</h2>
          <p>{industry}</p>
        </div>
        <div className="context-version">
          <span>Version</span>
          <strong>v{context.version}</strong>
        </div>
      </section>
      <div className="context-meta-grid">
        <ContextMeta label="Status" value={context.status} />
        <ContextMeta label="Last updated" value={updated} />
        <ContextMeta label="Updated by" value={context.updatedBy ?? "Not available"} />
      </div>
      <section className="context-detail-card">
        <div className="context-section-heading">
          <div>
            <span className="context-label">Context fields</span>
          </div>
          <span className="context-read-only">Read-only</span>
        </div>
        <div className="context-fields">
          {Object.entries(context.fields)
            .slice(0, 13)
            .map(([key, value]) => (
              <div className="context-field" key={key}>
                <span>{humanize(key)}</span>
                {Array.isArray(value) ? <ListValue value={value} /> : <strong className={!value ? "is-empty" : ""}>{displayValue(value)}</strong>}
              </div>
            ))}
        </div>
        {context.missingFields?.length ? (
          <div className="context-missing-fields">
            <span>Missing from source</span>
            <div>
              {context.missingFields.map((field) => (
                <em key={field}>{humanize(field)}</em>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function readField(fields: Record<string, unknown>, keys: string[]) {
  for (const key of keys) if (typeof fields[key] === "string" && fields[key]) return fields[key] as string;
  return null;
}

function displayValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return value ? "Structured value" : "—";
}

function ListValue({ value }: { value: unknown[] }) {
  return value.length ? (
    <ul className="context-value-list">
      {value.map((item, index) => (
        <li key={`${String(item)}-${index}`}>{String(item)}</li>
      ))}
    </ul>
  ) : (
    <span className="context-empty-value">Not provided</span>
  );
}

function humanize(value: string) {
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function ContextMeta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="context-meta">
      <span>{label}</span>
      <strong className={mono ? "is-mono" : ""}>{value}</strong>
    </div>
  );
}

function ContextLoading() {
  return (
    <div className="context-page">
      <div className="context-skeleton-heading" />
      <div className="context-skeleton-hero" />
      <div className="context-skeleton-grid">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="context-skeleton-detail" />
    </div>
  );
}

function ContextState({
  eyebrow = "Company intelligence",
  title,
  message,
  action,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  message: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="context-state">
      <div className="context-state-mark">{eyebrow === "Not found" ? "∅" : "i"}</div>
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{message}</p>
      {action &&
        (onAction ? (
          <button className="context-action" onClick={onAction}>
            {action}
          </button>
        ) : (
          <Link className="context-action" href="/settings/company-context/draft">
            {action}
          </Link>
        ))}
    </div>
  );
}
