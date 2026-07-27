"use client";

import dynamic from "next/dynamic";

import { startTransition, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bell, Bookmark, Building2, ChevronDown, FileText, LayoutDashboard, LogOut, Menu, Search, Settings, UserRound, Users, X, type LucideIcon } from "lucide-react";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSessionStore } from "@/shared/session-store";
import { useUiStore } from "@/shared/ui-store";
import { useFocusTrap } from "@/shared/focus-trap";
import { SavedIssueControl } from "@/shared/saved-issue-control";
import { CompleteIssueControl } from "@/shared/complete-issue-control";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import type { ApiSuccessResponse, CompanyOptionListDto } from "@/shared/types/api.types";
import { PermissionGate } from "@/shared/permission-guard";
import { OptimisticNavView, hasOptimisticNavView, prefetchOptimisticNavViews, toLocalePath } from "@/shared/optimistic-nav-view";
import { SoftNavLink, SoftNavProvider } from "@/shared/soft-nav";
import { useWorkspaceScope } from "@/shared/workspace-scope";
import { mergeCompanyOptions } from "@/shared/company-options";

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

const IssueDetailDrawer = dynamic(() => import("@/shared/issue-detail-drawer").then((module) => module.IssueDetailDrawer), {
  ssr: false,
  loading: () => null,
});

type IconName = "grid" | "bell" | "file" | "bookmark" | "settings" | "search" | "chevron" | "menu" | "close" | "user" | "users" | "building" | "logout" | "arrow";
async function readCompanies() { const response = await axiosClient.get<ApiSuccessResponse<CompanyOptionListDto>>(API_ENDPOINTS.companies); return response.data.data.items; }

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
};

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const Component = ICONS[name];
  return <Component size={size} strokeWidth={2} aria-hidden="true" />;
}

const navigation = [
  { href: "/", label: "Executive Summary", icon: "grid" as const },
  { href: "/issues", label: "News Feed", icon: "search" as const },
  { href: "/alerts", label: "Alerts", icon: "bell" as const },
  { href: "/reports", label: "Reports", icon: "file" as const },
  { href: "/saved", label: "Saved", icon: "bookmark" as const },
];

const PAGE_TITLES: Array<[prefix: string, title: string]> = [
  ["/settings/company-context/draft", "Company Context"],
  ["/settings/company-context", "Company Context"],
  ["/settings/alert-preferences", "Alert preferences"],
  ["/settings/news-intake", "News intake"],
  ["/settings/display-language", "Display language"],
  ["/settings/companies", "Companies"],
  ["/settings/platform", "Provisioning"],
  ["/settings/access", "Access"],
  ["/settings", "Settings"],
  ["/issues", "News Feed"],
  ["/alerts", "Alerts"],
  ["/reports", "Reports"],
  ["/saved", "Saved Issues"],
];

function pageTitleFor(path: string) {
  for (const [prefix, title] of PAGE_TITLES) {
    if (path.startsWith(prefix)) return title;
  }
  return "Executive Summary";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [query, setQuery] = useState("");
  const sidebarRef = useRef<HTMLElement>(null);
  const prevPathnameRef = useRef(pathname);
  const { isMobileNavOpen, setMobileNavOpen, openIssueId } = useUiStore();
  const { activeCompanyId, tenantId, setActiveCompanyId, setAuthenticatedSession, clearSession, actor, authorizedCompanies, permissions } = useSessionStore();
  const { hasCompany } = useWorkspaceScope();
  const companiesQuery = useQuery({ queryKey: ["authorized-companies"], queryFn: readCompanies, enabled: true, staleTime: 5 * 60_000, gcTime: 30 * 60_000, refetchOnWindowFocus: false, refetchOnReconnect: false, retry: false });
  const companies = mergeCompanyOptions(
    companiesQuery.data,
    authorizedCompanies,
    activeCompanyId ? [{ company_id: activeCompanyId, name: null, ...(tenantId ? { tenant_id: tenantId } : {}) }] : [],
  );
  const companiesLoading = companiesQuery.isPending || companiesQuery.isLoading;
  const companiesEmpty = !companiesLoading && companies.length === 0;
  const currentCompany = activeCompanyId ?? "workspace";
  const switcherLabel = hasCompany ? currentCompany : "No company selected";
  const profileName = actor?.fullName || actor?.email || "Workspace user";
  const profileRole = actor?.role ? actor.role.replaceAll("_", " ") : "Workspace member";
  const profileInitial = profileName.trim().slice(0, 1).toUpperCase() || "U";
  const activePath = pendingHref ?? pathname;
  const canOpenProvisioning = actor?.role === "platform_superadmin";

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
    if (company.company_id === activeCompanyId && (!company.tenant_id || company.tenant_id === tenantId)) {
      setCompanyOpen(false);
      return;
    }
    if (!company.tenant_id) {
      // Without tenant_id we cannot call switch-context safely; keep local selection only.
      setActiveCompanyId(company.company_id);
      setCompanyOpen(false);
      return;
    }
    try {
      const response = await axiosClient.post<{
        data: { access_token: string; tenant_id?: string; company_id?: string; role?: string; permissions?: string[] };
      }>(API_ENDPOINTS.authSwitchContext, { tenant_id: company.tenant_id, company_id: company.company_id });
      const data = response.data.data;
      const currentActor = useSessionStore.getState().actor;
      if (!currentActor) {
        setCompanyOpen(false);
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
          { company_id: company.company_id, name: company.name ?? null, tenant_id: company.tenant_id },
        ]),
      });
      setCompanyOpen(false);
      window.location.reload();
    } catch {
      setCompanyOpen(false);
    }
  }
  useFocusTrap(sidebarRef, isMobileNavOpen, () => setMobileNavOpen(false));
  useEffect(() => {
    const prevPathname = prevPathnameRef.current;
    prevPathnameRef.current = pathname;
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
    const hrefs = [
      ...navigation.map((item) => item.href),
      "/settings",
      "/settings/companies",
      "/settings/company-context",
      "/settings/company-context/draft",
      "/settings/alert-preferences",
      "/settings/news-intake",
      "/settings/display-language",
      "/settings/platform",
      "/settings/access",
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

  return (
    <SoftNavProvider navigate={handleNavigate}>
    <div className="app-shell" data-pending-href={pendingHref ?? undefined}>
      <div className={`shell-scrim ${isMobileNavOpen ? "is-visible" : ""}`} onClick={() => setMobileNavOpen(false)} />
      <aside ref={sidebarRef} className={`app-sidebar ${isMobileNavOpen ? "is-open" : ""}`} role={isMobileNavOpen ? "dialog" : "complementary"} aria-label="Primary navigation" aria-modal={isMobileNavOpen || undefined}>
        <div className="sidebar-brand">
          <div className="brand-mark">E</div>
          <div><strong>EGI Media</strong><span>AI Intelligence</span></div>
          <button className="shell-icon-button sidebar-close" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><Icon name="close" /></button>
        </div>
        <div className="sidebar-section-label">Workspace</div>
        <nav className="sidebar-nav">
          {navigation.map((item) => {
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
        <div className="sidebar-bottom">
          <SidebarLink
            href="/settings"
            className={`sidebar-link ${activePath.startsWith("/settings") && !activePath.startsWith("/settings/platform") && !activePath.startsWith("/settings/access") ? "is-active" : ""}`}
            onNavigate={handleNavigate}
          >
            <Icon name="settings" />
            <span>Settings</span>
          </SidebarLink>
          {actor?.role === "platform_superadmin" && (
            <SidebarLink
              href="/settings/platform"
              className={`sidebar-link ${activePath.startsWith("/settings/platform") ? "is-active" : ""}`}
              onNavigate={handleNavigate}
            >
              <Icon name="building" />
              <span>Provisioning</span>
            </SidebarLink>
          )}
          <PermissionGate permission="tenant.users.manage">
            <SidebarLink
              href="/settings/access"
              className={`sidebar-link ${activePath.startsWith("/settings/access") ? "is-active" : ""}`}
              onNavigate={handleNavigate}
            >
              <Icon name="users" />
              <span>Access</span>
            </SidebarLink>
          </PermissionGate>
          <div className="sidebar-status"><span className="status-pulse" /> Intelligence engine ready</div>
        </div>
      </aside>

      <div className="shell-main">
        <header className="app-header">
          <div className="header-left">
            <button className="shell-icon-button mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button>
            <h1 className="page-title">{pageTitleFor(activePath)}</h1>
          <div className="company-switcher-wrap">
            <button className="company-switcher" onClick={() => setCompanyOpen(!companyOpen)} aria-expanded={companyOpen} data-testid="company-switcher" data-has-company={hasCompany ? "true" : "false"}>
              <span className="company-avatar">{hasCompany ? currentCompany.slice(0, 1).toUpperCase() : "—"}</span>
              <span><small>Company scope</small><strong>{switcherLabel}</strong></span><Icon name="chevron" size={15} />
            </button>
            {companyOpen && (
              <div className="shell-popover company-popover" data-testid="company-switcher-popover" role="dialog" aria-label="Company switcher">
                {companiesLoading ? (
                  <div className="company-popover-empty" data-testid="company-switcher-loading">
                    <strong>Loading companies…</strong>
                    <p>Checking authorized company membership for this account.</p>
                  </div>
                ) : companiesQuery.isError && companies.length === 0 ? (
                  <div className="company-popover-empty" data-testid="company-switcher-error">
                    <strong>Companies unavailable</strong>
                    <p>Authorized companies could not be loaded. Retry later, or open Provisioning if you need to create a tenant and company first.</p>
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
                      data-testid="company-switcher-option"
                      data-company-id={company.company_id}
                      data-tenant-id={company.tenant_id || ""}
                    >
                      <span className="company-avatar small">{(company.name || company.company_id).slice(0, 1).toUpperCase()}</span>
                      <span>
                        <strong>{company.name || company.company_id}</strong>
                        <small>{company.tenant_id ? "Authorized scope" : "Scope incomplete"}</small>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          </div>
          <div className="header-actions">
            <label className="global-search"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search intelligence..." aria-label="Global search" /><kbd>⌘ K</kbd></label>
            <div className="header-menu-wrap"><button className="shell-icon-button notification-button" onClick={() => setNotificationOpen(!notificationOpen)} aria-label="Notifications" aria-expanded={notificationOpen}><Icon name="bell" /><span /></button>{notificationOpen && <div className="shell-popover notification-popover"><strong>Notifications</strong><p>Your intelligence feed is ready for review.</p><SidebarLink href="/alerts" className="notification-popover-link" onNavigate={handleNavigate}>Open alerts <Icon name="arrow" size={14} /></SidebarLink></div>}</div>
            <div className="header-menu-wrap"><button className="profile-button" onClick={() => setUserOpen(!userOpen)} aria-expanded={userOpen}><span className="profile-avatar">{profileInitial}</span><span className="profile-copy"><strong>{profileName}</strong><small>{profileRole}</small></span><Icon name="chevron" size={15} /></button>{userOpen && <div className="shell-popover user-popover"><button><Icon name="user" size={16} /> Profile</button><button type="button" onClick={() => {
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
              : children}
          </div>
        </main>
      </div>
      <IssueDetailDrawer />
      {openIssueId && <div className="issue-save-overlay"><SavedIssueControl issueId={openIssueId} /><CompleteIssueControl issueId={openIssueId} /></div>}
    </div>
    </SoftNavProvider>
  );
}
