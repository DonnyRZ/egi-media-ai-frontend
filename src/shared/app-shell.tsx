"use client";

import dynamic from "next/dynamic";

import { isAxiosError } from "axios";
import { startTransition, useDeferredValue, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, Bell, Bookmark, Building2, ChevronDown, FileText, LayoutDashboard, LogOut, Menu, Search, Settings, ShieldCheck, UserRound, Users, X, type LucideIcon } from "lucide-react";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSessionStore } from "@/shared/session-store";
import { useUiStore } from "@/shared/ui-store";
import { useFocusTrap } from "@/shared/focus-trap";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import type { ApiSuccessResponse, CompanyContextDto, CompanyOptionListDto, InboxEmailListDto, IssueCardDto, IssueListDto, NewsIntakeStatusDto } from "@/shared/types/api.types";
import { PermissionGate } from "@/shared/permission-guard";
import { OptimisticNavView, hasOptimisticNavView, prefetchOptimisticNavViews, toLocalePath } from "@/shared/optimistic-nav-view";
import { SoftNavLink, SoftNavProvider } from "@/shared/soft-nav";
import { useWorkspaceScope } from "@/shared/workspace-scope";
import { mergeCompanyOptions, activeCompanyLabel, displayCompanyName, displayCompanyInitial, resolveActiveCompany } from "@/shared/company-options";
import { PlatformProvisioning } from "@/shared/platform-provisioning";
import { BusyLabel, InlineLoading } from "@/shared/ux-state";

function isNavActive(href: string, path: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

function SidebarLink({
  href,
  className,
  children,
  onNavigate,
}: {
  href: string;
  className: string;
  children: ReactNode;
  onNavigate: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link href={href} className={className} prefetch={true} onClick={(event) => onNavigate(href, event)}>
      {children}
    </Link>
  );
}

function IssueDetailDrawerLoading() {
  return (
    <div className="issue-drawer-layer" role="status" aria-busy="true" aria-label="Opening issue detail">
      <div className="issue-drawer-backdrop" aria-hidden="true" />
      <aside className="issue-detail-drawer" aria-busy="true" aria-label="Issue detail loading">
        <header className="issue-drawer-header"><div><span className="drawer-eyebrow">Issue detail</span><InlineLoading label="Opening issue..." /></div></header>
        <div className="drawer-loading">{[1, 2, 3, 4, 5].map((item) => <span key={item} />)}</div>
      </aside>
    </div>
  );
}

const IssueDetailDrawer = dynamic(() => import("@/shared/issue-detail-drawer").then((module) => module.IssueDetailDrawer), {
  ssr: false,
  loading: IssueDetailDrawerLoading,
});

type IconName = "grid" | "bell" | "file" | "bookmark" | "settings" | "search" | "chevron" | "menu" | "close" | "user" | "users" | "building" | "logout" | "arrow" | "activity" | "shield";
async function readCompanies() { const response = await axiosClient.get<ApiSuccessResponse<CompanyOptionListDto>>(API_ENDPOINTS.companies); return response.data.data.items; }
async function readNotificationInbox() {
  const response = await axiosClient.get<ApiSuccessResponse<InboxEmailListDto>>(API_ENDPOINTS.inboxEmails, { params: { page: 1, limit: 50 } });
  return response.data.data;
}
async function readIntakeStatus() {
  const response = await axiosClient.get<ApiSuccessResponse<NewsIntakeStatusDto>>(API_ENDPOINTS.newsIntakeStatus);
  return response.data.data;
}
async function readContextReadiness(companyId: string) {
  try {
    const response = await axiosClient.get<ApiSuccessResponse<CompanyContextDto>>(API_ENDPOINTS.companyContext(companyId));
    const context = response.data.data;
    return {
      hasEffectiveContext: true,
      identityStatus: context.management_identity?.status ?? "missing",
    };
  } catch (error) {
    if (isAxiosError<{ error?: { code?: string } }>(error) && error.response?.status === 404 && error.response.data?.error?.code === "NOT_FOUND") {
      return { hasEffectiveContext: false, identityStatus: "missing" };
    }
    throw error;
  }
}
async function readGlobalSearch(query: string) {
  const response = await axiosClient.get<ApiSuccessResponse<IssueListDto>>(API_ENDPOINTS.issues, { params: { q: query, page: 1, limit: 8 } });
  return response.data.data;
}

const ICONS: Record<IconName, LucideIcon> = {
  grid: LayoutDashboard,
  bell: Bell,
  file: FileText,
  bookmark: Bookmark,
  settings: Settings,
  search: Search,
  chevron: ChevronDown,
  menu: Menu,
  close: X,
  user: UserRound,
  users: Users,
  building: Building2,
  logout: LogOut,
  arrow: ArrowRight,
  activity: Activity,
  shield: ShieldCheck,
};

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const Component = ICONS[name];
  return <Component size={size} strokeWidth={2} aria-hidden="true" />;
}

function GlobalSearch({
  companyId,
  hasCompany,
  canReadIssues,
  resetKey,
  onOpenIssue,
}: {
  companyId: string | null;
  hasCompany: boolean;
  canReadIssues: boolean;
  resetKey: string;
  onOpenIssue: (issueId: string) => void;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const deferredValue = useDeferredValue(value);
  const queryText = deferredValue.trim();
  const query = useQuery({
    queryKey: ["global-search", companyId, queryText],
    queryFn: () => readGlobalSearch(queryText),
    enabled: Boolean(companyId && hasCompany && canReadIssues && queryText.length >= 2),
    staleTime: 10_000,
    retry: false,
  });

  useEffect(() => {
    setValue("");
    setFocused(false);
  }, [resetKey, companyId]);
  useEffect(() => {
    function closeOnOutsideClick(event: globalThis.MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) setFocused(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const showResults = focused && value.trim().length >= 2;
  const placeholder = !hasCompany ? "Select a company to search" : canReadIssues ? "Search intelligence" : "Search unavailable for this role";

  return (
    <div ref={searchRef} className="global-search-wrap">
      <form className={`global-search ${!hasCompany || !canReadIssues ? "is-disabled" : ""}`} onSubmit={(event) => event.preventDefault()}>
        <Icon name="search" size={17} />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setFocused(false);
          }}
          placeholder={placeholder}
          aria-label="Search intelligence"
          disabled={!hasCompany || !canReadIssues}
        />
        {value && <button type="button" className="global-search-clear" aria-label="Clear search" onClick={() => setValue("")}><X size={15} aria-hidden="true" /></button>}
      </form>
      {showResults && (
        <div className="shell-popover global-search-popover" role="listbox" aria-label="Search results">
          {query.isPending ? (
            <div className="global-search-state"><InlineLoading label="Searching intelligence..." /></div>
          ) : query.isError ? (
            <div className="global-search-state is-error">Search is temporarily unavailable.</div>
          ) : !query.data?.items.length ? (
            <div className="global-search-state">No matching intelligence.</div>
          ) : (
            query.data.items.map((issue) => <GlobalSearchResult key={issue.issue_id} issue={issue} onOpen={() => { onOpenIssue(issue.issue_id); setValue(""); setFocused(false); }} />)
          )}
        </div>
      )}
    </div>
  );
}

function GlobalSearchResult({ issue, onOpen }: { issue: IssueCardDto; onOpen: () => void }) {
  return (
    <button type="button" className="global-search-result" role="option" aria-selected="false" onClick={onOpen}>
      <span className="global-search-result-copy"><strong>{issue.title || "Untitled issue"}</strong><small>{issue.one_liner || "No one-liner available."}</small></span>
      <span className="global-search-result-meta">{issue.priority || "Unprioritized"}</span>
    </button>
  );
}

const navigation = [
  { href: "/", label: "Executive Summary", icon: "grid" as const },
  { href: "/issues", label: "News Feed", icon: "search" as const },
  { href: "/alerts", label: "Alerts", icon: "bell" as const },
  { href: "/reports", label: "Reports", icon: "file" as const },
  { href: "/saved", label: "Saved", icon: "bookmark" as const },
];

const platformNavigation = [
  { href: "/settings/platform", label: "Platform overview", icon: "building" as const },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companySwitchPendingId, setCompanySwitchPendingId] = useState<string | null>(null);
  const [companySwitchError, setCompanySwitchError] = useState<string | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const companyMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const prevPathnameRef = useRef(pathname);
  const { isMobileNavOpen, setMobileNavOpen, openIssue } = useUiStore();
  const { activeCompanyId, tenantId, setActiveCompanyId, setAuthenticatedSession, clearSession, actor, authorizedCompanies, permissions } = useSessionStore();
  const { hasCompany } = useWorkspaceScope();
  const isPlatformAdmin = actor?.role === "platform_superadmin";
  const sidebarNavigation = isPlatformAdmin ? platformNavigation : navigation;
  const companiesQuery = useQuery({ queryKey: ["authorized-companies"], queryFn: readCompanies, enabled: !isPlatformAdmin, staleTime: 5 * 60_000, gcTime: 30 * 60_000, refetchOnWindowFocus: false, refetchOnReconnect: false, retry: false });
  const companies = mergeCompanyOptions(
    companiesQuery.data,
    authorizedCompanies,
    activeCompanyId ? [{ company_id: activeCompanyId, name: null, ...(tenantId ? { tenant_id: tenantId } : {}) }] : [],
  );
  const companiesLoading = companiesQuery.isPending || companiesQuery.isLoading;
  const companiesEmpty = !companiesLoading && companies.length === 0;
  const activeCompany = resolveActiveCompany(companies, activeCompanyId);
  const switcherLabel = hasCompany ? activeCompanyLabel(companies, activeCompanyId) : "No company selected";
  const switcherInitial = hasCompany ? displayCompanyInitial(activeCompany) : "—";
  const profileName = actor?.fullName || actor?.email || "Workspace user";
  const profileRole = actor?.role ? actor.role.replaceAll("_", " ") : "Workspace member";
  const profileInitial = profileName.trim().slice(0, 1).toUpperCase() || "U";
  const canReadAlerts = permissions.includes("alert.read");
  const canReadIntake = permissions.includes("news.intake.read");
  const canReadContext = permissions.includes("company_context.read");
  const intakeStatusQuery = useQuery({
    queryKey: ["shell-intake-status", activeCompanyId],
    queryFn: readIntakeStatus,
    enabled: Boolean(activeCompanyId && canReadIntake),
    staleTime: 15_000,
    retry: false,
  });
  const contextReadinessQuery = useQuery({
    queryKey: ["shell-company-context", activeCompanyId],
    queryFn: () => readContextReadiness(activeCompanyId as string),
    enabled: Boolean(activeCompanyId && canReadContext && !canReadIntake),
    staleTime: 30_000,
    retry: false,
  });
  const contextReadiness = contextReadinessQuery.data;
  const intelligenceStatus = !hasCompany
    ? "Select a company"
    : canReadIntake
      ? intakeStatusQuery.isPending
        ? "Checking engine status"
        : intakeStatusQuery.isError
          ? "Engine status unavailable"
            : !intakeStatusQuery.data
            ? "Checking engine status"
            : intakeStatusQuery.data.intake_ready
            ? "Intelligence engine ready"
            : intakeStatusQuery.data?.management_identity?.has_effective_context && intakeStatusQuery.data.management_identity.status !== "ready"
              ? "Identity needs attention"
              : "Context setup required"
      : !canReadContext
        ? "Workspace ready"
        : contextReadinessQuery.isPending
          ? "Checking context status"
          : contextReadinessQuery.isError
            ? "Context status unavailable"
            : !contextReadinessQuery.data
              ? "Checking context status"
            : contextReadiness?.hasEffectiveContext && contextReadiness.identityStatus === "ready"
              ? "Intelligence engine ready"
              : contextReadiness?.hasEffectiveContext
                ? "Identity needs attention"
                : "Context setup required";
  const intelligenceStatusTone = !hasCompany || intakeStatusQuery.data?.intake_ready === false || contextReadiness?.hasEffectiveContext === false ? "is-attention" : intakeStatusQuery.isError || contextReadinessQuery.isError ? "is-warning" : "";
  const notificationQuery = useQuery({
    queryKey: ["notification-inbox", activeCompanyId, actor?.id],
    queryFn: readNotificationInbox,
    enabled: Boolean(activeCompanyId && canReadAlerts),
    staleTime: 10_000,
    retry: false,
  });
  const unreadNotifications = notificationQuery.data?.items.filter((item) => !item.read).length ?? 0;
  const notificationMessage = !hasCompany
    ? "Select a company to see its notifications."
    : !canReadAlerts
      ? "Notifications are not available for this role."
      : notificationQuery.isPending
        ? "Checking for new notifications..."
        : notificationQuery.isError
          ? "Notifications are temporarily unavailable."
          : unreadNotifications > 0
            ? `${unreadNotifications} unread alert${unreadNotifications === 1 ? "" : "s"} need review.`
            : "No new notifications.";
  const activePath = pendingHref ?? pathname;
  const canOpenProvisioning = isPlatformAdmin;
  const showPlatformOverview = isPlatformAdmin && !pathname.startsWith("/settings/platform");

  function handleNavigate(href: string, event: MouseEvent<HTMLAnchorElement>) {
    // Soft nav under our control so optimistic UI does not interrupt the transition.
    event.preventDefault();
    if (href === pathname && pendingHref == null) return;
    // Only keep an optimistic overlay for known instant views; nested Settings
    // routes must clear any sticky hub immediately.
    setPendingHref(hasOptimisticNavView(href) ? href : null);
    setMobileNavOpen(false);
    setNotificationOpen(false);
    setCompanyOpen(false);
    setUserOpen(false);
    // Update the address bar immediately; Next RSC can catch up without feeling stuck.
    const nextPath = toLocalePath(href);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(window.history.state, "", nextPath);
    }
    startTransition(() => {
      router.replace(href);
    });
  }

  async function switchCompany(company: { company_id: string; tenant_id?: string; name?: string | null }) {
    setCompanySwitchError(null);
    if (company.company_id === activeCompanyId && (!company.tenant_id || company.tenant_id === tenantId)) {
      setCompanyOpen(false);
      return;
    }
    setCompanySwitchPendingId(company.company_id);
    if (!company.tenant_id) {
      // Without tenant_id we cannot call switch-context safely; keep local selection only.
      setActiveCompanyId(company.company_id);
      setCompanyOpen(false);
      setCompanySwitchPendingId(null);
      return;
    }
    try {
      const response = await axiosClient.post<{
        data: { access_token: string; tenant_id?: string; company_id?: string; role?: string; permissions?: string[]; company_name?: string | null };
      }>(API_ENDPOINTS.authSwitchContext, { tenant_id: company.tenant_id, company_id: company.company_id });
      const data = response.data.data;
      const currentActor = useSessionStore.getState().actor;
      if (!currentActor) {
        setCompanySwitchError("Your session expired. Sign in again before switching company.");
        return;
      }
      setAuthenticatedSession({
        accessToken: data.access_token,
        actor: { ...currentActor, role: data.role || currentActor.role },
        // Prefer switch-context permissions for the new membership role; keep prior if omitted.
        permissions: data.permissions?.length ? data.permissions : permissions,
        tenantId: data.tenant_id || company.tenant_id,
        activeCompanyId: data.company_id || company.company_id,
        authorizedCompanies: mergeCompanyOptions(authorizedCompanies, [
          {
            company_id: company.company_id,
            name: data.company_name ?? company.name ?? null,
            tenant_id: company.tenant_id,
          },
        ]),
      });
      setCompanyOpen(false);
      window.location.reload();
    } catch {
      setCompanySwitchError("Company could not be switched. Check your access and try again.");
    } finally {
      setCompanySwitchPendingId(null);
    }
  }
  useFocusTrap(sidebarRef, isMobileNavOpen, () => setMobileNavOpen(false));
  useEffect(() => {
    const prevPathname = prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    if (prevPathname !== pathname) {
      setNotificationOpen(false);
      setCompanyOpen(false);
      setUserOpen(false);
    }
    if (pendingHref == null) return;
    // Arrived at the optimistic target — drop overlay.
    if (pathname === pendingHref) {
      setPendingHref(null);
      return;
    }
    // Pathname moved elsewhere (nested Settings Open, back, etc.) — never keep a sticky hub.
    if (pathname !== prevPathname) {
      setPendingHref(null);
    }
  }, [pathname, pendingHref]);
  useEffect(() => {
    if (!showPlatformOverview) return;
    // Keep the visible URL in sync with the control-plane view even when a
    // direct navigation interrupts a previous App Router transition.
    const platformPath = toLocalePath("/settings/platform");
    if (window.location.pathname !== platformPath) {
      window.history.replaceState(window.history.state, "", platformPath);
    }
    router.replace("/settings/platform");
  }, [router, showPlatformOverview]);
  useEffect(() => {
    const hrefs = [
      ...navigation.map((item) => item.href),
      "/settings",
      "/settings/companies",
      "/settings/company-context",
      "/settings/company-context/versions",
      "/settings/company-context/draft",
      "/settings/alert-preferences",
      "/settings/news-intake",
      "/settings/display-language",
      "/settings/platform",
      "/settings/platform/health",
      "/settings/platform/audit-log",
      "/settings/access",
      "/settings/audit-log",
      "/saved",
    ];
    for (const href of hrefs) router.prefetch(href);
    prefetchOptimisticNavViews();
  }, [router]);
  useEffect(() => {
    function closeMenus(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setCompanyOpen(false);
      setNotificationOpen(false);
      setUserOpen(false);
      setMobileNavOpen(false);
    }
    document.addEventListener("keydown", closeMenus);
    return () => document.removeEventListener("keydown", closeMenus);
  }, [setMobileNavOpen]);
  useEffect(() => {
    function closeMenusOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Node;
      if (companyOpen && !companyMenuRef.current?.contains(target)) setCompanyOpen(false);
      if (notificationOpen && !notificationMenuRef.current?.contains(target)) setNotificationOpen(false);
      if (userOpen && !userMenuRef.current?.contains(target)) setUserOpen(false);
    }
    document.addEventListener("pointerdown", closeMenusOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeMenusOnOutsidePointer);
  }, [companyOpen, notificationOpen, userOpen]);

  return (
    <SoftNavProvider navigate={handleNavigate}>
    <div className="app-shell" data-pending-href={pendingHref ?? undefined}>
      <div className={`shell-scrim ${isMobileNavOpen ? "is-visible" : ""}`} onClick={() => setMobileNavOpen(false)} />
      <aside ref={sidebarRef} className={`app-sidebar ${isMobileNavOpen ? "is-open" : ""}`} role={isMobileNavOpen ? "dialog" : "complementary"} aria-label="Primary navigation" aria-modal={isMobileNavOpen || undefined}>
        <div className="sidebar-brand">
          <div className="brand-mark">E</div>
          <div><strong>EGI Media</strong><span>AI News Insight</span></div>
          <button className="shell-icon-button sidebar-close" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><Icon name="close" /></button>
        </div>
        <div className="sidebar-section-label">{isPlatformAdmin ? "Platform" : "Workspace"}</div>
        <nav className="sidebar-nav">
          {sidebarNavigation.map((item) => {
            const active = isNavActive(item.href, activePath);
            return (
              <SidebarLink
                key={item.href}
                href={item.href}
                className={`sidebar-link ${active ? "is-active" : ""}`}
                onNavigate={handleNavigate}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </SidebarLink>
            );
          })}
        </nav>
        {isPlatformAdmin && (
          <>
            <div className="sidebar-section-label sidebar-section-label-secondary">Operations</div>
            <div className="sidebar-nav" aria-label="Platform operations">
              <SidebarLink
                href="/settings/platform/health"
                className={`sidebar-link ${activePath.startsWith("/settings/platform/health") ? "is-active" : ""}`}
                onNavigate={handleNavigate}
              >
                <Icon name="activity" />
                <span>System health</span>
              </SidebarLink>
              <SidebarLink
                href="/settings/platform/audit-log"
                className={`sidebar-link ${activePath.startsWith("/settings/platform/audit-log") ? "is-active" : ""}`}
                onNavigate={handleNavigate}
              >
                <Icon name="shield" />
                <span>Audit log</span>
              </SidebarLink>
            </div>
          </>
        )}
        <div className="sidebar-bottom">
          {!isPlatformAdmin && (
            <>
              <PermissionGate permission="tenant.companies.manage">
                <SidebarLink
                  href="/settings/companies"
                  className={`sidebar-link ${activePath.startsWith("/settings/companies") ? "is-active" : ""}`}
                  onNavigate={handleNavigate}
                >
                  <Icon name="building" />
                  <span>Companies</span>
                </SidebarLink>
              </PermissionGate>
              {(permissions.includes("tenant.users.manage") || permissions.includes("company.users.manage")) && (
                <SidebarLink
                  href="/settings/access"
                  className={`sidebar-link ${activePath.startsWith("/settings/access") ? "is-active" : ""}`}
                  onNavigate={handleNavigate}
                >
                  <Icon name="users" />
                  <span>Access</span>
                </SidebarLink>
              )}
              <SidebarLink
                href="/settings"
                 className={`sidebar-link ${activePath.startsWith("/settings") && !activePath.startsWith("/settings/platform") && !activePath.startsWith("/settings/access") && !activePath.startsWith("/settings/companies") ? "is-active" : ""}`}
                onNavigate={handleNavigate}
              >
                <Icon name="settings" />
                <span>Settings</span>
              </SidebarLink>
            </>
          )}
          <div className={`sidebar-status ${isPlatformAdmin ? "platform-sidebar-status" : intelligenceStatusTone}`}><span className="status-pulse" /> {isPlatformAdmin ? "Control plane ready" : intelligenceStatus}</div>
        </div>
      </aside>

      <div className="shell-main">
        <header className="app-header">
          <div className="header-left">
            <button className="shell-icon-button mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button>
          {isPlatformAdmin ? (
            <div className="platform-scope-chip" aria-label="Platform control plane">
              <span className="platform-scope-icon"><Icon name="building" size={17} /></span>
              <span><small>Control plane</small><strong>Workspace registry</strong></span>
            </div>
          ) : (
          <div ref={companyMenuRef} className="company-switcher-wrap">
            <button className="company-switcher" onClick={() => { setCompanySwitchError(null); setCompanyOpen((value) => !value); setNotificationOpen(false); setUserOpen(false); }} aria-expanded={companyOpen} data-testid="company-switcher" data-has-company={hasCompany ? "true" : "false"}>
              <span className="company-avatar">{switcherInitial}</span>
              <span><small>Company scope</small><strong>{switcherLabel}</strong></span><Icon name="chevron" size={15} />
            </button>
            {companyOpen && (
              <div className="shell-popover company-popover" data-testid="company-switcher-popover" role="dialog" aria-label="Company switcher">
                {companySwitchError && <p className="company-switch-error" role="alert" data-testid="company-switcher-error-message">{companySwitchError}</p>}
                {companiesLoading ? (
                  <div className="company-popover-empty" data-testid="company-switcher-loading">
                    <InlineLoading label="Loading companies..." />
                    <strong>Loading companies…</strong>
                    <p>Checking authorized company membership for this account.</p>
                  </div>
                ) : companiesQuery.isError && companies.length === 0 ? (
                  <div className="company-popover-empty" data-testid="company-switcher-error">
                    <strong>Companies unavailable</strong>
                    <p>Authorized companies could not be loaded. Retry the membership check, or open Provisioning if you need to create a tenant and company first.</p>
                    <button type="button" className="context-action company-popover-cta" aria-busy={companiesQuery.isFetching} data-loading={companiesQuery.isFetching} disabled={companiesQuery.isFetching} onClick={() => void companiesQuery.refetch()}>
                      {companiesQuery.isFetching ? <BusyLabel>Retrying…</BusyLabel> : "Retry"}
                    </button>
                    {canOpenProvisioning && (
                      <SoftNavLink href="/settings/platform" className="context-action company-popover-cta">
                        Open Provisioning
                      </SoftNavLink>
                    )}
                  </div>
                ) : companiesEmpty ? (
                  <div className="company-popover-empty" data-testid="company-switcher-empty">
                    <strong>No authorized companies</strong>
                    <p>
                      This account has no company membership to switch into. Company-scoped intelligence stays inactive until a company exists and is assigned.
                    </p>
                    <p className="company-popover-next" data-testid="company-switcher-next">
                      {canOpenProvisioning
                        ? "Next: open Platform provisioning to create a tenant and company, then return here to select it."
                        : "Next: ask a platform admin to provision a company and grant you membership, then refresh this page."}
                    </p>
                    {canOpenProvisioning && (
                      <SoftNavLink href="/settings/platform" className="context-action company-popover-cta">
                        Open Provisioning
                      </SoftNavLink>
                    )}
                  </div>
                ) : (
                  companies.map((company) => (
                    <button
                      key={company.company_id}
                      onClick={() => switchCompany(company)}
                      type="button"
                      className="company-switcher-option"
                      disabled={companySwitchPendingId !== null}
                      aria-busy={companySwitchPendingId === company.company_id}
                      data-loading={companySwitchPendingId === company.company_id}
                      data-testid="company-switcher-option"
                      data-company-id={company.company_id}
                      data-tenant-id={company.tenant_id || ""}
                    >
                      <span className="company-avatar small">{displayCompanyInitial(company)}</span>
                      <span className="company-switcher-option-copy">
                        <strong>{displayCompanyName(company)}</strong>
                        <small>{companySwitchPendingId === company.company_id ? <BusyLabel>Switching…</BusyLabel> : company.tenant_id ? "Authorized scope" : "Scope incomplete"}</small>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          )}
          </div>
          <div className={`header-actions ${isPlatformAdmin ? "platform-header-actions" : ""}`}>
            {!isPlatformAdmin && permissions.includes("issue.read") && <GlobalSearch companyId={activeCompanyId} hasCompany={hasCompany} canReadIssues resetKey={pathname} onOpenIssue={openIssue} />}
            {!isPlatformAdmin && canReadAlerts && <div ref={notificationMenuRef} className="header-menu-wrap"><button className="shell-icon-button notification-button" onClick={() => { setNotificationOpen((value) => !value); setCompanyOpen(false); setUserOpen(false); }} aria-label="Notifications" aria-expanded={notificationOpen} aria-busy={notificationQuery.isPending}><Icon name="bell" />{unreadNotifications > 0 && <span aria-label={`${unreadNotifications} unread notifications`} />}</button>{notificationOpen && <div className="shell-popover notification-popover" role="dialog" aria-label="Notifications"><strong>Notifications</strong>{notificationQuery.isPending ? <InlineLoading label="Checking notifications..." /> : <p>{notificationMessage}</p>}{notificationQuery.isError && hasCompany && <button type="button" className="notification-popover-action" aria-busy={notificationQuery.isFetching} disabled={notificationQuery.isFetching} onClick={() => void notificationQuery.refetch()}>{notificationQuery.isFetching ? <BusyLabel>Retrying…</BusyLabel> : "Retry"}</button>}{hasCompany && <SidebarLink href="/alerts" className="notification-popover-link" onNavigate={handleNavigate}>Open alerts <Icon name="arrow" size={14} /></SidebarLink>}</div>}</div>}
            <div ref={userMenuRef} className="header-menu-wrap"><button className="profile-button" onClick={() => { setUserOpen((value) => !value); setCompanyOpen(false); setNotificationOpen(false); }} aria-expanded={userOpen}><span className="profile-avatar">{profileInitial}</span><span className="profile-copy"><strong>{profileName}</strong><small>{profileRole}</small></span><Icon name="chevron" size={15} /></button>{userOpen && <div className="shell-popover user-popover"><div className="user-popover-summary"><Icon name="user" size={16} /><span><strong>Account</strong><small>{profileRole}</small></span></div><button type="button" onClick={() => {
              setUserOpen(false);
              clearSession();
              // Hard navigate so we never linger on a protected route painting AuthGate.
              const locale = window.location.pathname.split("/").filter(Boolean)[0] || "id";
              window.location.assign(`${window.location.origin}/${locale}/login`);
            }}><Icon name="logout" size={16} /> Sign out</button></div>}</div>
          </div>
        </header>
        <main className="shell-content">
          <div className="shell-page-enter">
            {pendingHref && hasOptimisticNavView(pendingHref) && pendingHref !== pathname
              ? <OptimisticNavView href={pendingHref} />
              : showPlatformOverview ? <PlatformProvisioning /> : children}
          </div>
        </main>
      </div>
      <IssueDetailDrawer />
    </div>
    </SoftNavProvider>
  );
}
