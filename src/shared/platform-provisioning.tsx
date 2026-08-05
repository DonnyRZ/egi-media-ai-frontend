"use client";

import { isAxiosError } from "axios";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { AppSelect } from "@/shared/app-select";
import { displayCompanyName } from "@/shared/company-options";
import { axiosClient } from "@/shared/lib/axios-client";
import { PermissionGate } from "@/shared/permission-guard";
import { useSessionStore } from "@/shared/session-store";
import { SoftNavLink } from "@/shared/soft-nav";
import { useFocusTrap } from "@/shared/focus-trap";
import { BusyLabel, CollectionLoading, InlineLoading } from "@/shared/ux-state";

type TenantStatus = "pending" | "active" | "suspended" | "archived";
type Tenant = {
  tenant_id: string;
  name: string;
  status: TenantStatus;
  created_at?: string;
  updated_at?: string;
};
type Company = { company_id: string; name: string | null; status?: string };
type Membership = { membership_id: string; user_id: string; role: string; status: string; company_id?: string | null };
type LifecycleAction = "activate" | "suspend" | "resume" | "archive" | "restore";
type StatusFilter = TenantStatus | "all";

type OwnerNextSteps = {
  email: string;
  companyName: string;
  companyId: string;
  tenantName: string;
};

type TenantResponse = { data?: { tenant?: Tenant } };
type TenantCounts = { all: number; pending: number; active: number; suspended: number; archived: number };
type TenantList = { items: Tenant[]; meta: { page: number; limit: number; total: number; counts?: TenantCounts | null } };
type BulkLifecycleResponse = { data?: { updated_count?: number; tenants?: Tenant[] } };

const key = () => crypto.randomUUID();
const companiesKey = (tenantId: string) => ["platform-tenant-companies", tenantId] as const;
const membershipsKey = (tenantId: string) => ["platform-tenant-memberships", tenantId] as const;
const SELECTED_TENANT_KEY = "egi_media_ai_provisioning_selected_tenant";
const OWNER_NEXT_STEPS_KEY = "egi_media_ai_provisioning_owner_next_steps";
const TENANT_PAGE_SIZE = 20;

const STATUS_META: Record<TenantStatus, { label: string; description: string }> = {
  pending: { label: "Pending setup", description: "Finish setup before making this workspace operational." },
  active: { label: "Active", description: "Customer access and provisioning are available." },
  suspended: { label: "Suspended", description: "Customer access and intake are paused; data is retained." },
  archived: { label: "Archived", description: "The workspace is retained for audit and recovery." },
};

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
  { value: "archived", label: "Archived" },
];

const LIFECYCLE_ACTIONS: Record<TenantStatus, LifecycleAction[]> = {
  pending: ["activate", "archive"],
  active: ["suspend"],
  suspended: ["resume", "archive"],
  archived: ["restore"],
};

const ACTION_TARGET_STATUS: Record<LifecycleAction, TenantStatus> = {
  activate: "active",
  suspend: "suspended",
  resume: "active",
  archive: "archived",
  restore: "active",
};

const ACTION_META: Record<LifecycleAction, { label: string; title: string; description: string; requiresReason: boolean; intent: "primary" | "danger" }> = {
  activate: { label: "Activate workspace", title: "Activate this workspace?", description: "Customer access and eligible provisioning will be available once the workspace is active.", requiresReason: false, intent: "primary" },
  suspend: { label: "Suspend workspace", title: "Suspend this workspace?", description: "Customer sign-in and intake will pause. Workspace data and audit history will be retained.", requiresReason: true, intent: "danger" },
  resume: { label: "Resume workspace", title: "Resume this workspace?", description: "Customer access and eligible intake can resume when the workspace becomes active.", requiresReason: false, intent: "primary" },
  archive: { label: "Archive workspace", title: "Archive this workspace?", description: "The workspace will leave active operations and remain retained for audit and recovery.", requiresReason: true, intent: "danger" },
  restore: { label: "Restore workspace", title: "Restore this workspace?", description: "The workspace will return to active operations. Verify its company and owner setup before handoff.", requiresReason: false, intent: "primary" },
};

function isTenantStatus(value: unknown): value is TenantStatus {
  return value === "pending" || value === "active" || value === "suspended" || value === "archived";
}

function normalizeTenant(item: Tenant): Tenant {
  return { ...item, status: isTenantStatus(item.status) ? item.status : "pending" };
}

function readPersistedTenant(): Tenant | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SELECTED_TENANT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Tenant;
    return parsed?.tenant_id ? normalizeTenant(parsed) : null;
  } catch {
    return null;
  }
}

function persistTenant(tenant: Tenant | null) {
  if (typeof window === "undefined") return;
  if (!tenant) {
    window.sessionStorage.removeItem(SELECTED_TENANT_KEY);
    return;
  }
  window.sessionStorage.setItem(SELECTED_TENANT_KEY, JSON.stringify(tenant));
}

function readPersistedNextSteps(): OwnerNextSteps | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(OWNER_NEXT_STEPS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OwnerNextSteps;
    return parsed?.email ? parsed : null;
  } catch {
    return null;
  }
}

function persistNextSteps(next: OwnerNextSteps | null) {
  if (typeof window === "undefined") return;
  if (!next) {
    window.sessionStorage.removeItem(OWNER_NEXT_STEPS_KEY);
    return;
  }
  window.sessionStorage.setItem(OWNER_NEXT_STEPS_KEY, JSON.stringify(next));
}

function formatDate(value?: string) {
  if (!value) return "No update recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function errorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ error?: { message?: string } }>(error)) return error.response?.data?.error?.message || fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function StatusBadge({ status }: { status: TenantStatus }) {
  return <span className={`platform-tenant-status is-${status}`}><i aria-hidden="true" />{STATUS_META[status].label}</span>;
}

export function PlatformProvisioning() {
  const client = useQueryClient();
  const canManagePlatform = useSessionStore((state) => state.permissions.includes("platform.tenants.manage"));
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [createTenantOpen, setCreateTenantOpen] = useState(false);
  const [selected, setSelected] = useState<Tenant | null>(() => readPersistedTenant());
  const [revealSelected, setRevealSelected] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [searchInput, setSearchInput] = useState("");
  const searchQuery = useDeferredValue(searchInput.trim());
  const [page, setPage] = useState(1);
  const [rowActionTenantId, setRowActionTenantId] = useState<string | null>(null);
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [bulkLifecycleOpen, setBulkLifecycleOpen] = useState(false);
  const [bulkLifecycleReason, setBulkLifecycleReason] = useState("");
  const [bulkLifecycleError, setBulkLifecycleError] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerCompanyId, setOwnerCompanyId] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [notice, setNotice] = useState("");
  const [ownerNextSteps, setOwnerNextSteps] = useState<OwnerNextSteps | null>(() => readPersistedNextSteps());
  const [lifecycleAction, setLifecycleAction] = useState<LifecycleAction | null>(null);
  const [lifecycleReason, setLifecycleReason] = useState("");
  const [lifecycleError, setLifecycleError] = useState("");
  const bulkModalRef = useRef<HTMLElement>(null);
  const lifecycleModalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    persistTenant(selected);
  }, [selected]);

  useEffect(() => {
    persistNextSteps(ownerNextSteps);
  }, [ownerNextSteps]);

  const tenants = useQuery({
    queryKey: ["platform-tenants", page, statusFilter, searchQuery],
    enabled: canManagePlatform,
    queryFn: async () => {
      const response = await axiosClient.get<{ data?: { items?: Tenant[]; meta?: TenantList["meta"] } }>(API_ENDPOINTS.platformTenants, { params: { page, limit: TENANT_PAGE_SIZE, ...(statusFilter !== "all" ? { status: statusFilter } : {}), ...(searchQuery ? { q: searchQuery } : {}) } });
      const items = response.data?.data?.items;
      if (!Array.isArray(items)) throw new Error("Tenant list response was invalid");
      return { items: items.map(normalizeTenant), meta: { page, limit: TENANT_PAGE_SIZE, total: items.length, ...(response.data?.data?.meta || {}) } } satisfies TenantList;
    },
    retry: 2,
    refetchOnMount: "always",
    placeholderData: keepPreviousData,
  });

  const companies = useQuery({
    queryKey: companiesKey(selected?.tenant_id || ""),
    enabled: canManagePlatform && Boolean(selected?.tenant_id),
    queryFn: async () => {
      const response = await axiosClient.get<{ data?: { items?: Company[] } }>(API_ENDPOINTS.platformTenantCompanies(selected!.tenant_id), { params: { page: 1, limit: 100 } });
      const items = response.data?.data?.items;
      if (!Array.isArray(items)) throw new Error("Company list response was invalid");
      return items;
    },
    retry: 2,
    refetchOnMount: "always",
  });

  const memberships = useQuery({
    queryKey: membershipsKey(selected?.tenant_id || ""),
    enabled: canManagePlatform && Boolean(selected?.tenant_id),
    queryFn: async () => {
      const response = await axiosClient.get<{ data?: { items?: Membership[] } }>(API_ENDPOINTS.platformTenantMemberships(selected!.tenant_id), { params: { page: 1, limit: 100 } });
      const items = response.data?.data?.items;
      if (!Array.isArray(items)) throw new Error("Membership list response was invalid");
      return items;
    },
    retry: 2,
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (!tenants.data || tenants.isFetching || !selected) return;
    const fresh = tenants.data.items.find((tenant) => tenant.tenant_id === selected.tenant_id);
    // The registry is filtered and paginated. A selected workspace can be
    // absent from the current page without being deleted; keep its detail
    // panel mounted while the operator changes filters or pages.
    if (!fresh) return;
    if (fresh.name !== selected.name || fresh.status !== selected.status || fresh.updated_at !== selected.updated_at) setSelected(fresh);
  }, [selected, tenants.data, tenants.isFetching]);

  useEffect(() => {
    setPage(1);
    setSelectedTenantIds([]);
    setSelectAllMatching(false);
    setRowActionTenantId(null);
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    if (!rowActionTenantId) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      const actions = target instanceof Element ? target.closest<HTMLElement>("[data-tenant-actions]") : null;
      if (actions?.dataset.tenantActions !== rowActionTenantId) setRowActionTenantId(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRowActionTenantId(null);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [rowActionTenantId]);

  const visibleTenants = useMemo(() => {
    return tenants.data?.items || [];
  }, [tenants.data]);
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
  const bulkSourceStatus: Extract<TenantStatus, "active" | "pending" | "suspended"> | null = statusFilter === "active" || statusFilter === "pending" || statusFilter === "suspended" ? statusFilter : null;
  const bulkTargetStatus: TenantStatus | null = bulkSourceStatus === "active" ? "suspended" : bulkSourceStatus === "pending" || bulkSourceStatus === "suspended" ? "archived" : null;
  const bulkEligibleVisible = bulkSourceStatus ? visibleTenants.filter((tenant) => tenant.status === bulkSourceStatus) : [];
  const selectedVisibleCount = bulkEligibleVisible.filter((tenant) => selectedTenantIds.includes(tenant.tenant_id)).length;
  const bulkSelectedCount = selectAllMatching ? (bulkSourceStatus ? (filteredCounts?.[bulkSourceStatus] || tenants.data?.meta?.total || 0) : 0) : selectedTenantIds.length;
  const canBulkLifecycle = Boolean(bulkSourceStatus && bulkTargetStatus && bulkSelectedCount > 0);
  const bulkActionLabel = bulkTargetStatus === "archived" ? "Archive" : "Suspend";
  const hasAnyWorkspace = (filteredCounts?.all ?? tenants.data?.meta?.total ?? 0) > 0;
  const emptyStateHeading = !searchQuery && !hasAnyWorkspace ? "No customer workspaces yet" : !searchQuery && statusFilter !== "all" ? `No ${STATUS_META[statusFilter].label.toLowerCase()} workspaces` : "No matching workspaces";
  const emptyStateDescription = !searchQuery && !hasAnyWorkspace ? "Create the first workspace to begin provisioning a company and its owner." : "Adjust the search or status filter.";
  const statusOptions = STATUS_FILTERS.map((filter) => {
    const count = tenantRegistryLoading || tenants.error ? "—" : filter.value === "all"
      ? (filteredCounts?.all ?? counts.total)
      : (filteredCounts?.[filter.value] ?? (filter.value === statusFilter ? (tenants.data?.meta.total ?? 0) : "—"));
    return { value: filter.value, label: filter.label, meta: count };
  });

  const selectedCanProvision = Boolean(selected && (selected.status === "active" || selected.status === "pending"));
  const ownerMembership = memberships.data?.find((item) => item.role === "tenant_owner" && item.status === "active") || memberships.data?.find((item) => item.role === "tenant_owner" && item.status === "invited");
  const ownerStepLabel = ownerMembership?.status === "active" ? "Assigned" : ownerMembership?.status === "invited" ? "Invited" : "After company";

  const createTenant = useMutation({
    mutationFn: async () => (await axiosClient.post<TenantResponse>(API_ENDPOINTS.platformTenants, { name: name.trim() }, { headers: { "Idempotency-Key": key() } })).data,
    onSuccess: (result) => {
      const created = result.data?.tenant;
      setName("");
      setCreateTenantOpen(false);
      if (created) selectTenant(normalizeTenant(created));
      setNotice("Workspace created.");
      void client.invalidateQueries({ queryKey: ["platform-tenants"] });
    },
  });

  const createCompany = useMutation({
    mutationFn: async () => (await axiosClient.post(API_ENDPOINTS.platformTenantCompanies(selected!.tenant_id), { name: company.trim() }, { headers: { "Idempotency-Key": key() } })).data,
    onSuccess: () => {
      setCompany("");
      setOwnerNextSteps(null);
      setNotice("Company created.");
      if (selected) void client.invalidateQueries({ queryKey: companiesKey(selected.tenant_id) });
    },
  });

  const assignOwner = useMutation({
    mutationFn: async () => (await axiosClient.post(API_ENDPOINTS.platformTenantOwner(selected!.tenant_id), { email: ownerEmail.trim(), company_id: ownerCompanyId.trim(), ...(ownerFullName.trim() ? { full_name: ownerFullName.trim() } : {}) }, { headers: { "Idempotency-Key": key() } })).data,
    onSuccess: () => {
      const email = ownerEmail.trim().toLowerCase();
      const companyRow = companies.data?.find((item) => item.company_id === ownerCompanyId);
      setOwnerNextSteps({ email, companyId: ownerCompanyId, companyName: displayCompanyName(companyRow || { company_id: ownerCompanyId, name: null }), tenantName: selected?.name || "this workspace" });
      setOwnerEmail("");
      setOwnerCompanyId("");
      setOwnerFullName("");
      setNotice("");
      if (selected) void client.invalidateQueries({ queryKey: membershipsKey(selected.tenant_id) });
    },
  });

  const lifecycleMutation = useMutation({
    mutationFn: async ({ tenantId, status, reason }: { tenantId: string; status: TenantStatus; reason: string }) => {
      const response = await axiosClient.patch<TenantResponse>(API_ENDPOINTS.platformTenant(tenantId), { status, ...(reason ? { reason } : {}) }, { headers: { "Idempotency-Key": key() } });
      return response.data.data?.tenant ? normalizeTenant(response.data.data.tenant) : null;
    },
    onSuccess: (updatedTenant) => {
      if (updatedTenant) {
        setSelected(updatedTenant);
        void client.invalidateQueries({ queryKey: ["platform-tenants"] });
      }
      setNotice(updatedTenant ? `${updatedTenant.name} is now ${STATUS_META[updatedTenant.status].label.toLowerCase()}.` : "Workspace status updated.");
      setLifecycleAction(null);
      setLifecycleReason("");
      setLifecycleError("");
    },
  });

  const bulkLifecycleMutation = useMutation({
    mutationFn: async () => {
      const body = selectAllMatching
        ? { status: bulkTargetStatus, reason: bulkLifecycleReason.trim(), filter: { status: bulkSourceStatus, ...(searchQuery ? { q: searchQuery } : {}) } }
        : { status: bulkTargetStatus, reason: bulkLifecycleReason.trim(), tenant_ids: selectedTenantIds };
      const response = await axiosClient.post<BulkLifecycleResponse>(API_ENDPOINTS.platformTenantsBulkLifecycle, body, { headers: { "Idempotency-Key": key() } });
      return response.data;
    },
    onSuccess: (result) => {
      const updatedCount = result.data?.updated_count || bulkSelectedCount;
      setNotice(`${updatedCount} workspace${updatedCount === 1 ? " is" : "s are"} now ${STATUS_META[bulkTargetStatus || "archived"].label.toLowerCase()}.`);
      setSelectedTenantIds([]);
      setSelectAllMatching(false);
      setBulkLifecycleOpen(false);
      setBulkLifecycleReason("");
      setBulkLifecycleError("");
      void client.invalidateQueries({ queryKey: ["platform-tenants"] });
    },
  });

  const canAssign = Boolean(selectedCanProvision && ownerEmail.trim() && ownerCompanyId.trim() && !assignOwner.isPending);

  function selectTenant(tenant: Tenant) {
    setSelected(tenant);
    setRevealSelected(true);
    persistTenant(tenant);
    setOwnerCompanyId("");
    setNotice("");
    setOwnerNextSteps(null);
  }

  useEffect(() => {
    if (!revealSelected || !selected?.tenant_id) return;
    const detail = document.getElementById("selected-workspace-detail");
    detail?.scrollIntoView({ behavior: "auto", block: "start" });
    setRevealSelected(false);
  }, [revealSelected, selected?.tenant_id]);

  function beginLifecycleAction(action: LifecycleAction) {
    lifecycleMutation.reset();
    setLifecycleError("");
    setLifecycleReason("");
    setLifecycleAction(action);
    setRowActionTenantId(null);
  }

  function toggleTenantSelection(tenantId: string) {
    setSelectAllMatching(false);
    setSelectedTenantIds((current) => current.includes(tenantId) ? current.filter((id) => id !== tenantId) : [...current, tenantId]);
  }

  function toggleVisibleLifecycleSelection() {
    const allVisibleSelected = bulkEligibleVisible.length > 0 && bulkEligibleVisible.every((tenant) => selectedTenantIds.includes(tenant.tenant_id));
    setSelectAllMatching(false);
    setSelectedTenantIds((current) => allVisibleSelected
      ? current.filter((id) => !bulkEligibleVisible.some((tenant) => tenant.tenant_id === id))
      : [...new Set([...current, ...bulkEligibleVisible.map((tenant) => tenant.tenant_id)])]);
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

  const closeLifecycleDialog = useCallback(() => {
    if (lifecycleMutation.isPending) return;
    setLifecycleAction(null);
    setLifecycleReason("");
    setLifecycleError("");
  }, [lifecycleMutation.isPending]);
  const closeBulkLifecycleDialog = useCallback(() => {
    if (bulkLifecycleMutation.isPending) return;
    setBulkLifecycleOpen(false);
    setBulkLifecycleError("");
  }, [bulkLifecycleMutation.isPending]);
  useFocusTrap(bulkModalRef, bulkLifecycleOpen, closeBulkLifecycleDialog);
  useFocusTrap(lifecycleModalRef, Boolean(lifecycleAction && selected), closeLifecycleDialog);

  function submitLifecycle() {
    if (!selected || !lifecycleAction) return;
    const meta = ACTION_META[lifecycleAction];
    if (meta.requiresReason && !lifecycleReason.trim()) {
      setLifecycleError("Add a reason so this lifecycle change is recorded clearly.");
      return;
    }
    setLifecycleError("");
    lifecycleMutation.mutate({ tenantId: selected.tenant_id, status: ACTION_TARGET_STATUS[lifecycleAction], reason: lifecycleReason.trim() });
  }

  return (
    <PermissionGate
      permission="platform.tenants.manage"
      fallback={<div className="standard-state standard-state-forbidden"><h2>Platform administration only</h2><p>This control plane is not part of a customer workspace.</p></div>}
    >
      <div className="platform-console">
        <header className="platform-console-header">
          <div className="platform-console-header-row">
            <div>
              <p className="platform-eyebrow">Platform control plane</p>
              <h1>Workspace registry</h1>
            </div>
            <span className="platform-status-chip">Provisioning access</span>
          </div>
          <p>Provision and operate customer workspaces from one registry.</p>
        </header>

        <div className="platform-metrics platform-metrics-four" aria-label="Workspace summary">
          <div className="platform-metric"><span className="platform-metric-label">Total workspaces</span><strong className="platform-metric-value">{tenants.data ? counts.total : "—"}</strong></div>
          <div className="platform-metric"><span className="platform-metric-label">Active</span><strong className="platform-metric-value is-positive">{tenants.data ? counts.active : "—"}</strong></div>
          <div className="platform-metric"><span className="platform-metric-label">Needs attention</span><strong className={`platform-metric-value ${counts.attention ? "is-warning" : "is-positive"}`}>{tenants.data ? counts.attention : "—"}</strong></div>
          <div className="platform-metric"><span className="platform-metric-label">Archived</span><strong className="platform-metric-value is-muted">{tenants.data ? counts.archived : "—"}</strong></div>
        </div>

        <section className="platform-section" aria-labelledby="workspaces-heading">
          <div className="platform-section-header">
            <div><p className="platform-section-kicker">Workspace registry</p><h2 id="workspaces-heading">Customer workspaces</h2></div>
            <button type="button" className="platform-primary-button" onClick={() => { setCreateTenantOpen((value) => !value); setNotice(""); }}>{createTenantOpen ? "Close" : "New workspace"}</button>
          </div>

          <div className="platform-registry-toolbar">
            <div><span className="platform-toolbar-label">Filter by status</span><span className="platform-toolbar-hint">Active first; archived when needed.</span></div>
            <div className="platform-status-select">
              <AppSelect aria-label="Filter workspace status" value={statusFilter} options={statusOptions} onChange={setStatusFilter} size="sm" />
            </div>
          </div>

          <div className="platform-registry-controls">
            <label className="platform-search-field" htmlFor="workspace-search"><span>Search workspaces</span><input id="workspace-search" type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search by name or workspace ID" /></label>
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

          {createTenantOpen && (
            <form className="platform-inline-form" aria-busy={createTenant.isPending} onSubmit={(event) => { event.preventDefault(); if (name.trim()) createTenant.mutate(); }}>
              <div className="platform-field"><label htmlFor="tenant-name">Workspace name</label><input id="tenant-name" aria-label="Tenant name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Customer legal or workspace name" autoFocus /></div>
              <button type="submit" className="platform-primary-button" aria-busy={createTenant.isPending} data-loading={createTenant.isPending} disabled={!name.trim() || createTenant.isPending}>{createTenant.isPending ? <BusyLabel>Creating…</BusyLabel> : "Create workspace"}</button>
            </form>
          )}
          {createTenant.isError && <p className="platform-form-error" role="alert">Workspace could not be created. {errorMessage(createTenant.error, "Check the name and try again.")}</p>}

          {tenantRegistryLoading && <CollectionLoading label="Loading workspaces..." rows={4} className="platform-registry-loading" />}
          {tenants.error && <div className="platform-empty" role="alert"><strong>Workspaces could not be loaded</strong><p>The control plane did not return the tenant registry.</p><button type="button" className="platform-secondary-button" aria-busy={tenants.isFetching} data-loading={tenants.isFetching} disabled={tenants.isFetching} onClick={() => void tenants.refetch()}>{tenants.isFetching ? <BusyLabel>Retrying…</BusyLabel> : "Retry"}</button></div>}
          {!tenants.isLoading && !tenants.error && tenants.data?.meta.total === 0 && <div className="platform-empty"><strong>{emptyStateHeading}</strong><p>{emptyStateDescription}</p></div>}
          {canBulkLifecycle && <div className="platform-bulk-bar" role="region" aria-label="Bulk workspace actions"><div><strong>{bulkSelectedCount} {bulkSourceStatus ? STATUS_META[bulkSourceStatus].label.toLowerCase() : ""} workspace{bulkSelectedCount === 1 ? "" : "s"} selected</strong><span>{selectAllMatching ? `This action applies to every ${bulkSourceStatus ? STATUS_META[bulkSourceStatus].label.toLowerCase() : "eligible"} workspace matching the current filter.` : `${bulkActionLabel} selected workspaces in one audited operation.`}</span></div><button type="button" className="platform-danger-button" onClick={beginBulkLifecycle}>{bulkActionLabel} selected</button></div>}
          {bulkSourceStatus && bulkEligibleVisible.length > 0 && selectedVisibleCount === bulkEligibleVisible.length && !selectAllMatching && (tenants.data?.meta.total || 0) > bulkEligibleVisible.length && <div className="platform-select-all-banner" role="status"><span>All {STATUS_META[bulkSourceStatus].label.toLowerCase()} workspaces on this page are selected.</span><button type="button" onClick={() => setSelectAllMatching(true)}>Select all {tenants.data?.meta.total} matching</button></div>}
          {bulkSourceStatus && bulkEligibleVisible.length > 0 && <label className="platform-page-selection"><input type="checkbox" aria-label={`Select ${STATUS_META[bulkSourceStatus].label.toLowerCase()} workspaces on this page`} checked={selectAllMatching || selectedVisibleCount === bulkEligibleVisible.length} onChange={toggleVisibleLifecycleSelection} /><span>Select {STATUS_META[bulkSourceStatus].label.toLowerCase()} workspaces on this page</span><small>{bulkEligibleVisible.length} shown</small></label>}
          {visibleTenants.length > 0 && (
            <div className="platform-tenant-list" aria-label="Customer workspaces" id="workspace-registry-list">
              {visibleTenants.map((tenant) => (
                <article className={`platform-tenant-row ${selected?.tenant_id === tenant.tenant_id ? "is-selected" : ""}`} key={tenant.tenant_id}>
                  {bulkSourceStatus && tenant.status === bulkSourceStatus && <input className="platform-tenant-checkbox" type="checkbox" aria-label={`Select ${tenant.name}`} checked={selectedTenantIds.includes(tenant.tenant_id) || selectAllMatching} onChange={() => toggleTenantSelection(tenant.tenant_id)} />}
                  <div className="platform-tenant-meta"><strong>{tenant.name}</strong><small>{tenant.tenant_id}</small></div>
                  <StatusBadge status={tenant.status} />
                  <time className="platform-tenant-updated" dateTime={tenant.updated_at}>{formatDate(tenant.updated_at)}</time>
                  {selected?.tenant_id === tenant.tenant_id && <span className="platform-selected-marker">Selected</span>}
                  <div className="platform-row-actions" data-tenant-actions={tenant.tenant_id}><button type="button" className="platform-row-action" aria-pressed={selected?.tenant_id === tenant.tenant_id} onClick={() => selectTenant(tenant)}>{selected?.tenant_id === tenant.tenant_id ? "Opened" : "Open workspace"}</button><button type="button" className="platform-row-more" aria-haspopup="menu" aria-expanded={rowActionTenantId === tenant.tenant_id} aria-label={`Actions for ${tenant.name}`} onClick={() => setRowActionTenantId((current) => current === tenant.tenant_id ? null : tenant.tenant_id)}>⋯</button>{rowActionTenantId === tenant.tenant_id && <div className="platform-row-menu" role="menu">{LIFECYCLE_ACTIONS[tenant.status].map((action) => <button type="button" role="menuitem" key={action} className={ACTION_META[action].intent === "danger" ? "is-danger" : ""} onClick={() => { selectTenant(tenant); beginLifecycleAction(action); }}>{ACTION_META[action].label}</button>)}</div>}</div>
                </article>
              ))}
            </div>
          )}
          {tenants.data && tenants.data.meta.total > 0 && <nav className="platform-pagination" aria-label="Workspace pagination"><span>Page {page} of {totalPages}</span><div><button type="button" className="platform-secondary-button" disabled={page <= 1 || tenants.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><button type="button" className="platform-secondary-button" disabled={page >= totalPages || tenants.isFetching} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button></div></nav>}
          {notice && !ownerNextSteps && <p className="platform-inline-status" role="status">{notice}</p>}

          {selected && (
            <div className="platform-workspace-detail" id="selected-workspace-detail" tabIndex={-1}>
              <header className="platform-detail-header">
                <div><p className="platform-section-kicker">Selected workspace</p><h2>{selected.name}</h2><p>{selected.tenant_id}</p></div>
                <div className="platform-detail-actions"><StatusBadge status={selected.status} /><div className="platform-lifecycle-actions">{LIFECYCLE_ACTIONS[selected.status].map((action) => <button type="button" key={action} className={`platform-action-button ${ACTION_META[action].intent === "danger" ? "is-danger" : ""}`} onClick={() => beginLifecycleAction(action)}>{ACTION_META[action].label}</button>)}</div></div>
              </header>

              <div className={`platform-lifecycle-banner is-${selected.status}`} role="status"><div><span>Workspace status</span><strong>{STATUS_META[selected.status].label}</strong></div><p>{STATUS_META[selected.status].description}</p></div>

              <div className="platform-stepper" aria-label="Provisioning progress">
                <div className={`platform-step ${selected.status === "active" ? "is-complete" : selected.status === "pending" ? "is-current" : "is-paused"}`}><span className="platform-step-number">1</span><span className="platform-step-copy"><strong>Workspace</strong><small>{STATUS_META[selected.status].label}</small></span></div>
                <div className={`platform-step ${companies.data?.length ? "is-complete" : selectedCanProvision ? "is-current" : "is-paused"}`}><span className="platform-step-number">2</span><span className="platform-step-copy"><strong>Company</strong><small>{companies.data?.length ? "Ready" : selectedCanProvision ? "Next" : "Paused"}</small></span></div>
                <div className={`platform-step ${ownerMembership || ownerNextSteps ? "is-complete" : selectedCanProvision && companies.data?.length ? "is-current" : !selectedCanProvision ? "is-paused" : ""}`}><span className="platform-step-number">3</span><span className="platform-step-copy"><strong>Owner</strong><small>{ownerNextSteps ? "Invited" : !selectedCanProvision && !ownerMembership ? "Paused" : ownerStepLabel}</small></span></div>
              </div>

              {!selectedCanProvision && <div className="platform-readonly-callout"><strong>Provisioning paused</strong><span>Company and owner changes are unavailable while this workspace is {selected.status}. Select Resume or Restore above to continue.</span></div>}

              <div className={`platform-form-section ${createCompany.isPending ? "is-mutating" : ""}`} aria-busy={companies.isLoading || createCompany.isPending}>
                <h3>Companies</h3>
                <p>Companies define the customer scope inside this workspace.</p>
                {companies.isLoading && <CollectionLoading label="Loading companies..." rows={2} className="platform-company-loading" />}
                {companies.error && <div className="platform-empty" role="alert"><strong>Companies could not be loaded</strong><button type="button" className="platform-secondary-button" aria-busy={companies.isFetching} data-loading={companies.isFetching} disabled={companies.isFetching} onClick={() => void companies.refetch()}>{companies.isFetching ? <BusyLabel>Retrying…</BusyLabel> : "Retry"}</button></div>}
                {!companies.isLoading && !companies.error && companies.data?.length === 0 && <div className="platform-empty"><strong>No company provisioned</strong><p>Add the first company before assigning an owner.</p></div>}
                {companies.data && companies.data.length > 0 && <div className="platform-company-list">{companies.data.map((item) => <div className="platform-company-row" key={item.company_id}><div><strong>{displayCompanyName(item)}</strong><br /><small>{item.company_id}</small></div><small>{item.status || "active"}</small></div>)}</div>}
                {selectedCanProvision && <form className="platform-inline-form" aria-busy={createCompany.isPending} onSubmit={(event) => { event.preventDefault(); if (company.trim()) createCompany.mutate(); }}><div className="platform-field"><label htmlFor="company-name">Company name</label><input id="company-name" aria-label="Company name" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Customer company name" /></div><button type="submit" className="platform-primary-button" data-loading={createCompany.isPending} disabled={!company.trim() || createCompany.isPending}>{createCompany.isPending ? "Creating…" : "Create company"}</button></form>}
                {createCompany.isError && <p className="platform-form-error" role="alert">Company could not be created. {errorMessage(createCompany.error, "Check the name and try again.")}</p>}
              </div>

              <div className={`platform-form-section ${assignOwner.isPending ? "is-mutating" : ""}`} aria-busy={assignOwner.isPending}>
                <h3>Tenant owner</h3>
                {companies.data && companies.data.length > 0 ? (
                  selectedCanProvision ? <><p>Invite the person who will manage this customer workspace.</p><form className="platform-owner-form" aria-busy={assignOwner.isPending} onSubmit={(event) => { event.preventDefault(); if (canAssign) assignOwner.mutate(); }}><div className="platform-field"><label htmlFor="owner-email">Owner email</label><input id="owner-email" aria-label="Owner email" type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} placeholder="owner@company.com" /></div><div className="platform-field"><label htmlFor="owner-name">Full name <span>(optional)</span></label><input id="owner-name" aria-label="Owner full name" value={ownerFullName} onChange={(event) => setOwnerFullName(event.target.value)} placeholder="Full name" /></div><div className="platform-field"><label htmlFor="owner-company">Company</label><AppSelect id="owner-company" aria-label="Owner company" value={ownerCompanyId} options={[{ value: "", label: "Select company" }, ...companies.data.map((item) => ({ value: item.company_id, label: displayCompanyName(item) }))]} onChange={setOwnerCompanyId} /></div><button type="submit" className="platform-primary-button" data-loading={assignOwner.isPending} disabled={!canAssign}>{assignOwner.isPending ? "Assigning…" : "Assign owner"}</button></form>{assignOwner.isError && <p className="platform-form-error" role="alert">Owner could not be assigned. {errorMessage(assignOwner.error, "Check the email and selected company.")}</p>}</> : <div className="platform-readonly-panel"><strong>Owner changes are paused</strong><span>The current workspace status is {STATUS_META[selected.status].label.toLowerCase()}. Existing ownership remains available for audit.</span></div>
                ) : <div className="platform-empty platform-owner-locked"><strong>Owner assignment unlocks after a company is created</strong><p>There is no company to attach the tenant owner to yet.</p></div>}
              </div>
            </div>
          )}
        </section>

        {ownerNextSteps && <section className="platform-success" data-testid="provisioning-owner-next-steps" role="status"><strong>Tenant owner assigned</strong><span>{ownerNextSteps.email} can access {ownerNextSteps.companyName} after signing up with this exact email.</span><SoftNavLink href="/signup">Open signup page</SoftNavLink></section>}

        <section className="platform-section platform-capabilities" aria-labelledby="operations-heading"><div className="platform-section-header"><div><p className="platform-section-kicker">Platform operations</p><h2 id="operations-heading">Control plane visibility</h2><p>Review service readiness and access history without entering a customer workspace.</p></div></div><div className="platform-capability-grid"><SoftNavLink href="/settings/platform/health" className="platform-capability-card platform-capability-link"><span className="platform-capability-label">Live checks</span><strong>System health</strong><p>Check service, persistence, automation, and provider readiness.</p><span className="platform-capability-action">Open health →</span></SoftNavLink><SoftNavLink href="/settings/platform/audit-log" className="platform-capability-card platform-capability-link"><span className="platform-capability-label">Accountability</span><strong>Audit log</strong><p>Review access decisions with actor, scope, action, and outcome.</p><span className="platform-capability-action">Open audit log →</span></SoftNavLink></div></section>

        {bulkLifecycleOpen && <div className="platform-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeBulkLifecycleDialog(); }}><section ref={bulkModalRef} className="platform-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-lifecycle-title" aria-describedby="bulk-lifecycle-description"><div className="platform-modal-heading"><div className="platform-modal-icon is-danger" aria-hidden="true">!</div><div><p className="platform-eyebrow">Bulk workspace lifecycle</p><h2 id="bulk-lifecycle-title">{bulkActionLabel} {bulkSelectedCount} workspaces?</h2><p id="bulk-lifecycle-description">{bulkTargetStatus === "archived" ? "These workspaces will leave daily operations. Data and audit history will be retained." : "Customer sign-in and intake will pause. Data and audit history will be retained."} The operation is applied atomically.</p></div></div><div className="platform-modal-workspace"><strong>{selectAllMatching ? `All ${STATUS_META[bulkSourceStatus || "active"].label.toLowerCase()} workspaces matching the current filter` : `${bulkSelectedCount} selected workspaces`}</strong><StatusBadge status={bulkSourceStatus || "active"} /></div><form aria-busy={bulkLifecycleMutation.isPending} onSubmit={(event) => { event.preventDefault(); submitBulkLifecycle(); }}><label className="platform-modal-field" htmlFor="bulk-lifecycle-reason"><span>Reason <em>Required</em></span><textarea id="bulk-lifecycle-reason" value={bulkLifecycleReason} onChange={(event) => setBulkLifecycleReason(event.target.value)} placeholder="For example: subscription ended or payment is overdue" maxLength={500} autoFocus /><small>{bulkLifecycleReason.length}/500</small></label>{(bulkLifecycleError || bulkLifecycleMutation.isError) && <p className="platform-form-error" role="alert">{bulkLifecycleError || errorMessage(bulkLifecycleMutation.error, `Bulk ${bulkActionLabel.toLowerCase()} could not be completed.`)}</p>}<div className="platform-modal-actions"><button type="button" className="platform-secondary-button" onClick={closeBulkLifecycleDialog} disabled={bulkLifecycleMutation.isPending}>Cancel</button><button type="submit" className="platform-primary-button is-danger" aria-busy={bulkLifecycleMutation.isPending} data-loading={bulkLifecycleMutation.isPending} disabled={bulkLifecycleMutation.isPending}>{bulkLifecycleMutation.isPending ? <BusyLabel>{bulkTargetStatus === "archived" ? "Archiving…" : "Suspending…"}</BusyLabel> : `${bulkActionLabel} ${bulkSelectedCount} workspaces`}</button></div></form></section></div>}

        {lifecycleAction && selected && <div className="platform-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeLifecycleDialog(); }}><section ref={lifecycleModalRef} className="platform-modal" role="dialog" aria-modal="true" aria-labelledby="lifecycle-dialog-title" aria-describedby="lifecycle-dialog-description"><div className="platform-modal-heading"><div className={`platform-modal-icon is-${ACTION_META[lifecycleAction].intent}`} aria-hidden="true">{ACTION_META[lifecycleAction].intent === "danger" ? "!" : "✓"}</div><div><p className="platform-eyebrow">Workspace lifecycle</p><h2 id="lifecycle-dialog-title">{ACTION_META[lifecycleAction].title}</h2><p id="lifecycle-dialog-description">{ACTION_META[lifecycleAction].description}</p></div></div><div className="platform-modal-workspace"><strong>{selected.name}</strong><StatusBadge status={selected.status} /></div><form aria-busy={lifecycleMutation.isPending} onSubmit={(event) => { event.preventDefault(); submitLifecycle(); }}>{ACTION_META[lifecycleAction].requiresReason && <label className="platform-modal-field" htmlFor="lifecycle-reason"><span>Reason <em>Required</em></span><textarea id="lifecycle-reason" value={lifecycleReason} onChange={(event) => setLifecycleReason(event.target.value)} placeholder="For example: subscription ended or payment is overdue" maxLength={500} autoFocus /><small>{lifecycleReason.length}/500</small></label>}{(lifecycleError || lifecycleMutation.isError) && <p className="platform-form-error" role="alert">{lifecycleError || errorMessage(lifecycleMutation.error, "Workspace status could not be updated.")}</p>}<div className="platform-modal-actions"><button type="button" className="platform-secondary-button" onClick={closeLifecycleDialog} disabled={lifecycleMutation.isPending}>Cancel</button><button type="submit" autoFocus={!ACTION_META[lifecycleAction].requiresReason} className={`platform-primary-button ${ACTION_META[lifecycleAction].intent === "danger" ? "is-danger" : ""}`} aria-busy={lifecycleMutation.isPending} data-loading={lifecycleMutation.isPending} disabled={lifecycleMutation.isPending}>{lifecycleMutation.isPending ? <BusyLabel>Updating…</BusyLabel> : ACTION_META[lifecycleAction].label}</button></div></form></section></div>}
      </div>
    </PermissionGate>
  );
}
