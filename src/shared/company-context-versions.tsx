"use client";

import { isAxiosError } from "axios";
import { ArrowRight, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mapCompanyContext } from "@/shared/api-mappers";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { PermissionGate } from "@/shared/permission-guard";
import { ScopeRequired } from "@/shared/prerequisite-gate";
import { useSessionStore } from "@/shared/session-store";
import { useWorkspaceScope } from "@/shared/workspace-scope";
import { SoftNavLink } from "@/shared/soft-nav";
import { useFocusTrap } from "@/shared/focus-trap";
import type { ApiSuccessResponse, CompanyContextVersionListDto } from "@/shared/types/api.types";
import { CollectionPagination, StandardState } from "@/shared/ux-state";

type ContextVersion = ReturnType<typeof mapCompanyContext>;
const CONTEXT_VERSIONS_PAGE_SIZE = 20;

async function fetchContextVersions(companyId: string, page: number) {
  const response = await axiosClient.get<ApiSuccessResponse<CompanyContextVersionListDto>>(API_ENDPOINTS.companyContextVersions(companyId), { params: { page, limit: CONTEXT_VERSIONS_PAGE_SIZE } });
  return {
    ...response.data.data,
    items: response.data.data.items.map(mapCompanyContext),
  };
}

async function deleteEffectiveContext(companyId: string) {
  const response = await axiosClient.delete<ApiSuccessResponse<{ cleared: boolean; archived_version: number | null; company_id: string }>>(
    API_ENDPOINTS.companyContext(companyId),
    { headers: { "Idempotency-Key": `company-context-delete-${crypto.randomUUID()}` } },
  );
  return response.data.data;
}

function apiError(error: unknown) {
  if (isAxiosError<{ error?: { code?: string; message?: string } }>(error)) {
    return { code: error.response?.data?.error?.code ?? "NETWORK_ERROR", message: error.response?.data?.error?.message ?? "The context could not be loaded." };
  }
  return { code: "UNKNOWN_ERROR", message: error instanceof Error ? error.message : "The context could not be loaded." };
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function CompanyContextVersions() {
  const scope = useWorkspaceScope();
  const companyId = scope.activeCompanyId;

  return (
    <ScopeRequired
      require="company"
      scope={scope}
      title="Company required for context"
      reason="Company Context is scoped to the active company. Select a company before managing its versions."
      nextStep="Pick a company in the header switcher, then return here."
    >
      <PermissionGate
        permission="company_context.read"
        fallback={<StandardState kind="forbidden" title="Context history restricted" message="Your role cannot view company context versions." />}
      >
        <CompanyContextVersionsBody companyId={companyId as string} />
      </PermissionGate>
    </ScopeRequired>
  );
}

function CompanyContextVersionsBody({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const canApprove = useSessionStore((state) => state.permissions.includes("company_context.approve"));
  const canDraft = useSessionStore((state) => state.permissions.includes("company_context.draft"));
  const [confirmVersion, setConfirmVersion] = useState<number | null>(null);
  const [previewVersion, setPreviewVersion] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["company-context-versions", companyId, page],
    queryFn: () => fetchContextVersions(companyId, page),
    enabled: Boolean(companyId),
    staleTime: 60_000,
    retry: (failureCount, error) => failureCount < 1 && apiError(error).code === "NETWORK_ERROR",
    placeholderData: keepPreviousData,
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteEffectiveContext(companyId),
    onSuccess: (result) => {
      setConfirmVersion(null);
      setNotice({ kind: "success", text: result.archived_version ? `Context v${result.archived_version} deleted. Intake is paused until another context is approved.` : "Context deleted. Intake is paused until another context is approved." });
      void queryClient.invalidateQueries({ queryKey: ["company-context-versions", companyId] });
      void queryClient.invalidateQueries({ queryKey: ["company-context", companyId] });
      void queryClient.invalidateQueries({ queryKey: ["news-intake-status", companyId] });
    },
    onError: (error) => setNotice({ kind: "error", text: apiError(error).message }),
  });

  const queryItems = query.data?.items;
  const items = useMemo(() => queryItems ?? [], [queryItems]);
  const totalVersions = query.data?.meta.total ?? 0;
  const versionLimit = query.data?.meta.limit || CONTEXT_VERSIONS_PAGE_SIZE;
  const versionPageCount = Math.max(1, Math.ceil(totalVersions / versionLimit));
  useEffect(() => {
    if (page > versionPageCount) setPage(versionPageCount);
  }, [page, versionPageCount]);
  const preview = useMemo(() => items.find((item) => item.version === previewVersion) ?? null, [items, previewVersion]);
  const noticeNode = notice && <div className={`context-versions-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>{notice.text}</div>;

  if (query.isLoading) return <div className="context-versions-page"><ContextVersionsHeading /><div className="context-version-skeleton" /></div>;
  if (query.isError) {
    const error = apiError(query.error);
    return (
      <div className="context-versions-page">
        {noticeNode}
        <ContextVersionsHeading />
        <div className="context-versions-error" role="alert">
          <strong>Context history unavailable</strong>
          <span>{error.message}</span>
          <button type="button" className="context-action context-action-secondary" aria-busy={query.isFetching} data-loading={query.isFetching} disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? "Retrying…" : "Try again"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="context-versions-page">
      {noticeNode}
      <ContextVersionsHeading />
      {!items.length ? (
        <EmptyContextState canCreate={canApprove || canDraft} canApprove={canApprove} />
      ) : (
        <section className="context-version-list" aria-labelledby="context-version-list-heading">
          <div className="context-version-list-heading">
            <div>
              <span className="context-label">Context registry</span>
              <div className="context-version-list-title-row">
                <h2 id="context-version-list-heading">Saved versions</h2>
                 <span className="context-version-count">{totalVersions} {totalVersions === 1 ? "version" : "versions"}</span>
              </div>
            </div>
            {(canApprove || canDraft) && <SoftNavLink className="context-action" href="/settings/company-context/draft">Create revision</SoftNavLink>}
          </div>
          <div className="context-version-items">
            {items.map((context) => {
              const isEffective = context.status === "effective";
              const identityStatus = context.managementIdentity?.status ?? "missing";
              const companyName = readField(context.fields, ["company_name", "companyName", "name"]) ?? "Company context";
              return (
                <article className={`context-version-row ${isEffective ? "is-effective" : "is-archived"}`} key={context.id}>
                  <div className="context-version-number">v{context.version}</div>
                  <div className="context-version-row-main">
                    <div className="context-version-row-title">
                      <strong>{companyName}</strong>
                      <span className={`context-version-status ${isEffective ? "is-effective" : "is-archived"}`}>{isEffective ? "Effective" : "Archived"}</span>
                    </div>
                    <span>Updated {formatDate(context.updatedAt)} · Identity {identityStatus}</span>
                  </div>
                  <div className="context-version-row-actions">
                    {isEffective ? (
                      <SoftNavLink className="source-preview-button" href="/settings/company-context">Open <ArrowRight size={14} aria-hidden="true" /></SoftNavLink>
                    ) : (
                      <button className="source-preview-button" type="button" onClick={() => setPreviewVersion(context.version)}>View <ArrowRight size={14} aria-hidden="true" /></button>
                    )}
                    {isEffective && canApprove && (
                      <button
                        type="button"
                        className="context-icon-danger"
                        aria-label={`Delete context version ${context.version}`}
                        title={`Delete version ${context.version}`}
                        disabled={deleteMutation.isPending}
                        onClick={() => { setNotice(null); setConfirmVersion(context.version); }}
                      >
                        <Trash2 size={17} strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {confirmVersion === context.version && (
                    <ContextDeleteDialog
                      version={context.version}
                      busy={deleteMutation.isPending}
                      onClose={() => setConfirmVersion(null)}
                      onConfirm={() => deleteMutation.mutate()}
                    />
                  )}
                </article>
              );
            })}
           </div>
           <CollectionPagination page={page} total={totalVersions} limit={versionLimit} onPageChange={setPage} isFetching={query.isFetching} label="versions" />
         </section>
      )}
      {preview && <ContextSnapshotDialog context={preview} onClose={() => setPreviewVersion(null)} />}
    </div>
  );
}

function ContextVersionsHeading() {
  return <div className="context-versions-heading"><div><span className="eyebrow">Company intelligence</span><h1>Context history</h1></div></div>;
}

function EmptyContextState({ canCreate, canApprove }: { canCreate: boolean; canApprove: boolean }) {
  return (
    <section className="context-versions-empty" aria-labelledby="context-empty-heading">
      <span className="context-empty-mark">0</span>
      <h2 id="context-empty-heading">No context yet</h2>
      <p>{canApprove ? "Create and approve a company context before news intake can run." : canCreate ? "Create a context draft and submit it for approval before news intake can run." : "No approved context is available for this company yet."}</p>
      {canCreate && <SoftNavLink className="context-action" href="/settings/company-context/draft">Create context</SoftNavLink>}
    </section>
  );
}

function ContextSnapshotDialog({ context, onClose }: { context: ContextVersion; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  useFocusTrap(dialogRef, true, onClose);
  const companyName = readField(context.fields, ["company_name", "companyName", "name"]) ?? "Company context";
  const identityStatus = context.managementIdentity?.status ?? "missing";
  return (
    <div className="source-preview-layer">
      <button className="source-preview-backdrop" type="button" aria-label="Close context version preview" onClick={onClose} />
      <section ref={dialogRef} className="source-preview-card context-snapshot-dialog" role="dialog" aria-modal="true" aria-labelledby="context-snapshot-title">
        <button className="drawer-close" type="button" aria-label="Close context version preview" onClick={onClose}><X size={18} aria-hidden="true" /></button>
        <span className="eyebrow">Archived snapshot</span>
        <h2 id="context-snapshot-title">Version v{context.version}</h2>
        <div className="context-snapshot-meta">
          <div><span>Company</span><strong>{companyName}</strong></div>
          <div><span>Status</span><strong>{context.status}</strong></div>
          <div><span>Updated</span><strong>{formatDate(context.updatedAt)}</strong></div>
          <div><span>Identity</span><strong>{identityStatus}</strong></div>
        </div>
        {context.managementIdentity?.lensSummary && <p className="context-snapshot-lens">{context.managementIdentity.lensSummary}</p>}
        <div className="context-snapshot-fields">
          {Object.entries(context.fields).map(([key, value]) => (
            <div className="context-field" key={key}>
              <span>{humanize(key)}</span>
              {Array.isArray(value) ? <ListValue value={value} /> : <strong className={!value ? "is-empty" : ""}>{displayValue(value)}</strong>}
            </div>
          ))}
        </div>
        <div className="context-snapshot-footer"><button className="context-action context-action-secondary" type="button" onClick={onClose}>Close</button></div>
      </section>
    </div>
  );
}

function ContextDeleteDialog({ version, busy, onClose, onConfirm }: { version: number; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true, () => {
    if (!busy) onClose();
  });
  return (
    <div className="context-delete-dialog-backdrop" role="presentation" onClick={() => { if (!busy) onClose(); }}>
      <div ref={dialogRef} className="context-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="context-delete-title" onClick={(event) => event.stopPropagation()}>
        <span className="context-delete-dialog-icon"><Trash2 size={18} aria-hidden="true" /></span>
        <h2 id="context-delete-title">Delete version {version}?</h2>
        <p>Intake will pause until another company context is approved.</p>
        <div className="context-delete-dialog-actions">
          <button type="button" className="context-action context-action-secondary" disabled={busy} onClick={onClose}>Cancel</button>
          <button type="button" className="context-action context-action-danger" aria-busy={busy} data-loading={busy} disabled={busy} onClick={onConfirm}>{busy ? "Deleting..." : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function readField(fields: Record<string, unknown>, keys: string[]) {
  for (const key of keys) if (typeof fields[key] === "string" && fields[key]) return fields[key] as string;
  return null;
}

function displayValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return value ? "Structured value" : "Not provided";
}

function ListValue({ value }: { value: unknown[] }) {
  return value.length ? <ul className="context-value-list">{value.map((item, index) => <li key={`${String(item)}-${index}`}>{String(item)}</li>)}</ul> : <span className="context-empty-value">Not provided</span>;
}

function humanize(value: string) { return value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
