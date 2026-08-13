"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { AppSelect } from "@/shared/app-select";
import { axiosClient } from "@/shared/lib/axios-client";
import { useFocusTrap } from "@/shared/focus-trap";
import { PermissionGate } from "@/shared/permission-guard";
import {
  STATUS_META,
  errorMessage,
  formatDate,
  idempotencyKey,
  normalizeTenant,
  type StatusFilter,
  type Tenant,
  type TenantStatus,
} from "@/shared/platform-tenant-shared";
import { StatusBadge } from "@/shared/platform-status-badge";
import { useSessionStore } from "@/shared/session-store";
import { SoftNavLink } from "@/shared/soft-nav";
import { BusyLabel, CollectionLoading, InlineLoading } from "@/shared/ux-state";

type TenantResponse = { data?: { tenant?: Tenant } };
type TenantCounts = { all: number; pending: number; active: number; suspended: number; archived: number };
type TenantList = { items: Tenant[]; meta: { page: number; limit: number; total: number; counts?: TenantCounts | null } };
type BulkLifecycleResponse = { data?: { updated_count?: number; tenants?: Tenant[] } };

const TENANT_PAGE_SIZE = 20;

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
  { value: "archived", label: "Archived" },
];

export function PlatformProvisioning() {
  const client = useQueryClient();
  const canManagePlatform = useSessionStore((state) => state.permissions.includes("platform.tenants.manage"));
  const [name, setName] = useState("");
  const [createTenantOpen, setCreateTenantOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [searchInput, setSearchInput] = useState("");
  const searchQuery = useDeferredValue(searchInput.trim());
  const [page, setPage] = useState(1);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [bulkLifecycleOpen, setBulkLifecycleOpen] = useState(false);
  const [bulkLifecycleReason, setBulkLifecycleReason] = useState("");
  const [bulkLifecycleError, setBulkLifecycleError] = useState("");
  const [notice, setNotice] = useState("");
  const createModalRef = useRef<HTMLElement>(null);
  const bulkModalRef = useRef<HTMLElement>(null);

  const tenants = useQuery({
    queryKey: ["platform-tenants", page, statusFilter, searchQuery],
    enabled: canManagePlatform,
    queryFn: async () => {
      const response = await axiosClient.get<{ data?: { items?: Tenant[]; meta?: TenantList["meta"] } }>(API_ENDPOINTS.platformTenants, {
        params: { page, limit: TENANT_PAGE_SIZE, ...(statusFilter !== "all" ? { status: statusFilter } : {}), ...(searchQuery ? { q: searchQuery } : {}) },
      });
      const items = response.data?.data?.items;
      if (!Array.isArray(items)) throw new Error("Tenant list response was invalid");
      return { items: items.map(normalizeTenant), meta: { page, limit: TENANT_PAGE_SIZE, total: items.length, ...(response.data?.data?.meta || {}) } } satisfies TenantList;
    },
    retry: 2,
    refetchOnMount: "always",
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    setPage(1);
    setSelectedTenantIds([]);
    setSelectAllMatching(false);
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    if (!selectMode) {
      setSelectedTenantIds([]);
      setSelectAllMatching(false);
    }
  }, [selectMode]);

  const visibleTenants = useMemo(() => tenants.data?.items || [], [tenants.data]);
  const tenantRegistryLoading = tenants.isLoading && !tenants.error;
  const tenantRegistryRefreshing = tenants.isFetching && Boolean(tenants.data);

  const counts = useMemo(() => {
    const items = tenants.data?.items || [];
    const fromApi = tenants.data?.meta?.counts;
    return {
      total: fromApi?.all ?? tenants.data?.meta?.total ?? items.length,
      active: fromApi?.active ?? items.filter((tenant) => tenant.status === "active").length,
      attention: fromApi ? fromApi.pending + fromApi.suspended : items.filter((tenant) => tenant.status === "pending" || tenant.status === "suspended").length,
      archived: fromApi?.archived ?? items.filter((tenant) => tenant.status === "archived").length,
    };
  }, [tenants.data]);

  const filteredCounts = tenants.data?.meta?.counts;
  const totalPages = Math.max(1, Math.ceil((tenants.data?.meta?.total || 0) / TENANT_PAGE_SIZE));
  const bulkSourceStatus: Extract<TenantStatus, "active" | "pending" | "suspended"> | null =
    statusFilter === "active" || statusFilter === "pending" || statusFilter === "suspended" ? statusFilter : null;
  const bulkTargetStatus: TenantStatus | null = bulkSourceStatus === "active" ? "suspended" : bulkSourceStatus === "pending" || bulkSourceStatus === "suspended" ? "archived" : null;
  const bulkEligibleVisible = bulkSourceStatus ? visibleTenants.filter((tenant) => tenant.status === bulkSourceStatus) : [];
  const selectedVisibleCount = bulkEligibleVisible.filter((tenant) => selectedTenantIds.includes(tenant.tenant_id)).length;
  const bulkSelectedCount = selectAllMatching ? (bulkSourceStatus ? filteredCounts?.[bulkSourceStatus] || tenants.data?.meta?.total || 0 : 0) : selectedTenantIds.length;
  const canBulkLifecycle = Boolean(bulkSourceStatus && bulkTargetStatus && bulkSelectedCount > 0);
  const bulkActionLabel = bulkTargetStatus === "archived" ? "Archive" : "Suspend";
  const hasAnyWorkspace = (filteredCounts?.all ?? tenants.data?.meta?.total ?? 0) > 0;
  const emptyStateHeading = !searchQuery && !hasAnyWorkspace
    ? "No customer workspaces yet"
    : !searchQuery && statusFilter !== "all"
      ? `No ${STATUS_META[statusFilter].label.toLowerCase()} workspaces`
      : "No matching workspaces";
  const emptyStateDescription = !searchQuery && !hasAnyWorkspace
    ? "Create the first workspace to begin provisioning a company and its owner."
    : "Adjust the search or status filter.";
  const statusOptions = STATUS_FILTERS.map((filter) => {
    const count = tenantRegistryLoading || tenants.error
      ? "—"
      : filter.value === "all"
        ? filteredCounts?.all ?? counts.total
        : filteredCounts?.[filter.value] ?? (filter.value === statusFilter ? tenants.data?.meta.total ?? 0 : "—");
    return { value: filter.value, label: filter.label, meta: count };
  });

  const createTenant = useMutation({
    mutationFn: async () => (await axiosClient.post<TenantResponse>(API_ENDPOINTS.platformTenants, { name: name.trim() }, { headers: { "Idempotency-Key": idempotencyKey() } })).data,
    onSuccess: (result) => {
      const created = result.data?.tenant;
      setName("");
      setCreateTenantOpen(false);
      setPage(1);
      setSearchInput("");
      setSelectMode(false);
      setSelectedTenantIds([]);
      setSelectAllMatching(false);
      if (created?.status && STATUS_FILTERS.some((filter) => filter.value === created.status)) {
        setStatusFilter(created.status);
      }
      void client.invalidateQueries({ queryKey: ["platform-tenants"] });
      setNotice(created ? `Workspace created. Open ${created.name} when you're ready.` : "Workspace created.");
    },
  });

  const bulkLifecycleMutation = useMutation({
    mutationFn: async () => {
      const body = selectAllMatching
        ? { status: bulkTargetStatus, reason: bulkLifecycleReason.trim(), filter: { status: bulkSourceStatus, ...(searchQuery ? { q: searchQuery } : {}) } }
        : { status: bulkTargetStatus, reason: bulkLifecycleReason.trim(), tenant_ids: selectedTenantIds };
      const response = await axiosClient.post<BulkLifecycleResponse>(API_ENDPOINTS.platformTenantsBulkLifecycle, body, { headers: { "Idempotency-Key": idempotencyKey() } });
      return response.data;
    },
    onSuccess: (result) => {
      const updatedCount = result.data?.updated_count || bulkSelectedCount;
      setNotice(`${updatedCount} workspace${updatedCount === 1 ? " is" : "s are"} now ${STATUS_META[bulkTargetStatus || "archived"].label.toLowerCase()}.`);
      setSelectedTenantIds([]);
      setSelectAllMatching(false);
      setSelectMode(false);
      setBulkLifecycleOpen(false);
      setBulkLifecycleReason("");
      setBulkLifecycleError("");
      void client.invalidateQueries({ queryKey: ["platform-tenants"] });
    },
  });

  function toggleTenantSelection(tenantId: string) {
    setSelectAllMatching(false);
    setSelectedTenantIds((current) => (current.includes(tenantId) ? current.filter((id) => id !== tenantId) : [...current, tenantId]));
  }

  function toggleVisibleLifecycleSelection() {
    const allVisibleSelected = bulkEligibleVisible.length > 0 && bulkEligibleVisible.every((tenant) => selectedTenantIds.includes(tenant.tenant_id));
    setSelectAllMatching(false);
    setSelectedTenantIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !bulkEligibleVisible.some((tenant) => tenant.tenant_id === id))
        : [...new Set([...current, ...bulkEligibleVisible.map((tenant) => tenant.tenant_id)])],
    );
  }

  function beginBulkLifecycle() {
    bulkLifecycleMutation.reset();
    setBulkLifecycleError("");
    setBulkLifecycleReason("");
    setBulkLifecycleOpen(true);
  }

  function submitBulkLifecycle() {
    if (!bulkLifecycleReason.trim()) {
      setBulkLifecycleError("Add a reason so every lifecycle change is recorded clearly.");
      return;
    }
    setBulkLifecycleError("");
    bulkLifecycleMutation.mutate();
  }

  const closeCreateDialog = () => {
    if (createTenant.isPending) return;
    setCreateTenantOpen(false);
  };
  const closeBulkLifecycleDialog = () => {
    if (bulkLifecycleMutation.isPending) return;
    setBulkLifecycleOpen(false);
    setBulkLifecycleError("");
  };
  useFocusTrap(createModalRef, createTenantOpen, closeCreateDialog);
  useFocusTrap(bulkModalRef, bulkLifecycleOpen, closeBulkLifecycleDialog);

  return (
    <PermissionGate
      permission="platform.tenants.manage"
      fallback={<div className="standard-state standard-state-forbidden"><h2>Platform administration only</h2><p>This control plane is not part of a customer workspace.</p></div>}
    >
      <div className="platform-console">
        <div className="platform-metrics platform-metrics-four" aria-label="Workspace summary">
          <div className="platform-metric"><span className="platform-metric-label">Total workspaces</span><strong className="platform-metric-value">{tenants.data ? counts.total : "—"}</strong></div>
          <div className="platform-metric"><span className="platform-metric-label">Active</span><strong className="platform-metric-value is-positive">{tenants.data ? counts.active : "—"}</strong></div>
          <div className="platform-metric"><span className="platform-metric-label">Needs attention</span><strong className={`platform-metric-value ${counts.attention ? "is-warning" : "is-positive"}`}>{tenants.data ? counts.attention : "—"}</strong></div>
          <div className="platform-metric"><span className="platform-metric-label">Archived</span><strong className="platform-metric-value is-muted">{tenants.data ? counts.archived : "—"}</strong></div>
        </div>

        <section className="platform-section" aria-labelledby="workspaces-heading">
          <div className="platform-section-header">
            <div>
              <p className="platform-section-kicker">Workspace registry</p>
              <h2 id="workspaces-heading">Customer workspaces</h2>
            </div>
            <div className="platform-section-header-actions">
              {bulkSourceStatus && (
                <button type="button" className="platform-secondary-button" onClick={() => setSelectMode((value) => !value)}>
                  {selectMode ? "Done selecting" : "Select workspaces"}
                </button>
              )}
              <button type="button" className="platform-primary-button" onClick={() => setCreateTenantOpen(true)}>
                New workspace
              </button>
            </div>
          </div>

          <div className="platform-registry-toolbar">
            <div>
              <span className="platform-toolbar-label">Filter by status</span>
              <span className="platform-toolbar-hint">Active first; archived when needed.</span>
            </div>
            <div className="platform-status-select">
              <AppSelect aria-label="Filter workspace status" value={statusFilter} options={statusOptions} onChange={setStatusFilter} size="sm" />
            </div>
          </div>

          <div className="platform-registry-controls">
            <label className="platform-search-field" htmlFor="workspace-search">
              <span>Search workspaces</span>
              <input
                id="workspace-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by name or workspace ID"
              />
            </label>
            {tenantRegistryLoading && <InlineLoading label="Loading workspace registry..." />}
            {tenantRegistryRefreshing && <InlineLoading label="Refreshing workspace registry..." />}
            <span className="platform-results-summary">
              {tenants.error
                ? "Workspace registry unavailable"
                : tenants.data
                  ? `${tenants.data.meta.total} matching workspace${tenants.data.meta.total === 1 ? "" : "s"}`
                  : "Loading workspace registry…"}
            </span>
          </div>

          {tenantRegistryLoading && <CollectionLoading label="Loading workspaces..." rows={4} className="platform-registry-loading" />}
          {tenants.error && (
            <div className="platform-empty" role="alert">
              <strong>Workspaces could not be loaded</strong>
              <p>The control plane did not return the tenant registry.</p>
              <button
                type="button"
                className="platform-secondary-button"
                aria-busy={tenants.isFetching}
                data-loading={tenants.isFetching}
                disabled={tenants.isFetching}
                onClick={() => void tenants.refetch()}
              >
                {tenants.isFetching ? <BusyLabel>Retrying…</BusyLabel> : "Retry"}
              </button>
            </div>
          )}
          {!tenants.isLoading && !tenants.error && tenants.data?.meta.total === 0 && (
            <div className="platform-empty">
              <strong>{emptyStateHeading}</strong>
              <p>{emptyStateDescription}</p>
            </div>
          )}

          {selectMode && bulkSourceStatus && bulkEligibleVisible.length > 0 && (
            <label className="platform-page-selection">
              <input
                type="checkbox"
                aria-label={`Select ${STATUS_META[bulkSourceStatus].label.toLowerCase()} workspaces on this page`}
                checked={selectAllMatching || selectedVisibleCount === bulkEligibleVisible.length}
                onChange={toggleVisibleLifecycleSelection}
              />
              <span>Select {STATUS_META[bulkSourceStatus].label.toLowerCase()} workspaces on this page</span>
              <small>{bulkEligibleVisible.length} shown</small>
            </label>
          )}
          {selectMode && bulkSourceStatus && bulkEligibleVisible.length > 0 && selectedVisibleCount === bulkEligibleVisible.length && !selectAllMatching && (tenants.data?.meta.total || 0) > bulkEligibleVisible.length && (
            <div className="platform-select-all-banner" role="status">
              <span>All {STATUS_META[bulkSourceStatus].label.toLowerCase()} workspaces on this page are selected.</span>
              <button type="button" onClick={() => setSelectAllMatching(true)}>Select all {tenants.data?.meta.total} matching</button>
            </div>
          )}
          {selectMode && canBulkLifecycle && (
            <div className="platform-bulk-bar" role="region" aria-label="Bulk workspace actions">
              <div>
                <strong>{bulkSelectedCount} {bulkSourceStatus ? STATUS_META[bulkSourceStatus].label.toLowerCase() : ""} workspace{bulkSelectedCount === 1 ? "" : "s"} selected</strong>
                <span>
                  {selectAllMatching
                    ? `This action applies to every ${bulkSourceStatus ? STATUS_META[bulkSourceStatus].label.toLowerCase() : "eligible"} workspace matching the current filter.`
                    : `${bulkActionLabel} selected workspaces in one audited operation.`}
                </span>
              </div>
              <button type="button" className="platform-danger-button" onClick={beginBulkLifecycle}>{bulkActionLabel} selected</button>
            </div>
          )}

          {visibleTenants.length > 0 && (
            <div className="platform-tenant-list" aria-label="Customer workspaces" id="workspace-registry-list">
              {visibleTenants.map((tenant) => (
                <article className="platform-tenant-row" key={tenant.tenant_id}>
                  {selectMode && bulkSourceStatus && tenant.status === bulkSourceStatus && (
                    <input
                      className="platform-tenant-checkbox"
                      type="checkbox"
                      aria-label={`Select ${tenant.name}`}
                      checked={selectedTenantIds.includes(tenant.tenant_id) || selectAllMatching}
                      onChange={() => toggleTenantSelection(tenant.tenant_id)}
                    />
                  )}
                  <div className="platform-tenant-meta">
                    <strong>{tenant.name}</strong>
                    <small>{tenant.tenant_id}</small>
                  </div>
                  <StatusBadge status={tenant.status} />
                  <time className="platform-tenant-updated" dateTime={tenant.updated_at}>{formatDate(tenant.updated_at)}</time>
                  <div className="platform-row-actions">
                    <SoftNavLink href={`/settings/platform/tenants/${tenant.tenant_id}`} className="platform-row-action">
                      Open workspace
                    </SoftNavLink>
                  </div>
                </article>
              ))}
            </div>
          )}
          {tenants.data && tenants.data.meta.total > 0 && (
            <nav className="platform-pagination" aria-label="Workspace pagination">
              <span>Page {page} of {totalPages}</span>
              <div>
                <button type="button" className="platform-secondary-button" disabled={page <= 1 || tenants.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
                <button type="button" className="platform-secondary-button" disabled={page >= totalPages || tenants.isFetching} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
              </div>
            </nav>
          )}
          {notice && <p className="platform-inline-status" role="status">{notice}</p>}
        </section>

        {createTenantOpen && (
          <div className="platform-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCreateDialog(); }}>
            <section ref={createModalRef} className="platform-modal" role="dialog" aria-modal="true" aria-labelledby="create-tenant-title" aria-describedby="create-tenant-description">
              <div className="platform-modal-heading">
                <div className="platform-modal-icon" aria-hidden="true">+</div>
                <div>
                  <p className="platform-eyebrow">Workspace registry</p>
                  <h2 id="create-tenant-title">Create a new workspace</h2>
                  <p id="create-tenant-description">You will be taken to its setup page to add the first company and owner.</p>
                </div>
              </div>
              <form
                aria-busy={createTenant.isPending}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (name.trim()) createTenant.mutate();
                }}
              >
                <label className="platform-modal-field" htmlFor="tenant-name">
                  <span>Workspace name</span>
                  <input id="tenant-name" aria-label="Tenant name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Customer legal or workspace name" autoFocus />
                </label>
                {createTenant.isError && (
                  <p className="platform-form-error" role="alert">Workspace could not be created. {errorMessage(createTenant.error, "Check the name and try again.")}</p>
                )}
                <div className="platform-modal-actions">
                  <button type="button" className="platform-secondary-button" onClick={closeCreateDialog} disabled={createTenant.isPending}>Cancel</button>
                  <button type="submit" className="platform-primary-button" aria-busy={createTenant.isPending} data-loading={createTenant.isPending} disabled={!name.trim() || createTenant.isPending}>
                    {createTenant.isPending ? <BusyLabel>Creating…</BusyLabel> : "Create workspace"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {bulkLifecycleOpen && (
          <div className="platform-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeBulkLifecycleDialog(); }}>
            <section ref={bulkModalRef} className="platform-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-lifecycle-title" aria-describedby="bulk-lifecycle-description">
              <div className="platform-modal-heading">
                <div className="platform-modal-icon is-danger" aria-hidden="true">!</div>
                <div>
                  <p className="platform-eyebrow">Bulk workspace lifecycle</p>
                  <h2 id="bulk-lifecycle-title">{bulkActionLabel} {bulkSelectedCount} workspaces?</h2>
                  <p id="bulk-lifecycle-description">
                    {bulkTargetStatus === "archived" ? "These workspaces will leave daily operations. Data and audit history will be retained." : "Customer sign-in and intake will pause. Data and audit history will be retained."} The operation is applied atomically.
                  </p>
                </div>
              </div>
              <div className="platform-modal-workspace">
                <strong>{selectAllMatching ? `All ${STATUS_META[bulkSourceStatus || "active"].label.toLowerCase()} workspaces matching the current filter` : `${bulkSelectedCount} selected workspaces`}</strong>
                <StatusBadge status={bulkSourceStatus || "active"} />
              </div>
              <form
                aria-busy={bulkLifecycleMutation.isPending}
                onSubmit={(event) => {
                  event.preventDefault();
                  submitBulkLifecycle();
                }}
              >
                <label className="platform-modal-field" htmlFor="bulk-lifecycle-reason">
                  <span>Reason <em>Required</em></span>
                  <textarea
                    id="bulk-lifecycle-reason"
                    value={bulkLifecycleReason}
                    onChange={(event) => setBulkLifecycleReason(event.target.value)}
                    placeholder="For example: subscription ended or payment is overdue"
                    maxLength={500}
                    autoFocus
                  />
                  <small>{bulkLifecycleReason.length}/500</small>
                </label>
                {(bulkLifecycleError || bulkLifecycleMutation.isError) && (
                  <p className="platform-form-error" role="alert">{bulkLifecycleError || errorMessage(bulkLifecycleMutation.error, `Bulk ${bulkActionLabel.toLowerCase()} could not be completed.`)}</p>
                )}
                <div className="platform-modal-actions">
                  <button type="button" className="platform-secondary-button" onClick={closeBulkLifecycleDialog} disabled={bulkLifecycleMutation.isPending}>Cancel</button>
                  <button
                    type="submit"
                    className="platform-primary-button is-danger"
                    aria-busy={bulkLifecycleMutation.isPending}
                    data-loading={bulkLifecycleMutation.isPending}
                    disabled={bulkLifecycleMutation.isPending}
                  >
                    {bulkLifecycleMutation.isPending ? <BusyLabel>{bulkTargetStatus === "archived" ? "Archiving…" : "Suspending…"}</BusyLabel> : `${bulkActionLabel} ${bulkSelectedCount} workspaces`}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
