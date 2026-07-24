"use client";

import dynamic from "next/dynamic";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { Link, usePathname } from "@/i18n/navigation";
import { useSessionStore } from "@/shared/session-store";
import { useUiStore } from "@/shared/ui-store";
import { useFocusTrap } from "@/shared/focus-trap";
import { SavedIssueControl } from "@/shared/saved-issue-control";
import { FeedbackForm } from "@/shared/feedback-form";
import { CompleteIssueControl } from "@/shared/complete-issue-control";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import type { ApiSuccessResponse, CompanyOptionListDto } from "@/shared/types/api.types";
import { PermissionGate } from "@/shared/permission-guard";

const IssueDetailDrawer = dynamic(() => import("@/shared/issue-detail-drawer").then((module) => module.IssueDetailDrawer), {
  ssr: false,
  loading: () => null,
});

type IconName = "grid" | "bell" | "file" | "bookmark" | "settings" | "search" | "chevron" | "menu" | "close" | "user" | "logout" | "arrow";
async function readCompanies() { const response = await axiosClient.get<ApiSuccessResponse<CompanyOptionListDto>>(API_ENDPOINTS.companies); return response.data.data.items; }

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  const paths: Record<IconName, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></>,
    bookmark: <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4z" />,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.1h-2.6v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6.4v-2.6h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V4.4H15v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1V13h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    chevron: <path d="m7 10 5 5 5-5" />,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3M21 3v18" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

const navigation = [
  { href: "/", label: "Executive Summary", icon: "grid" as const },
  { href: "/issues", label: "All Issues", icon: "search" as const },
  { href: "/alerts", label: "Alerts", icon: "bell" as const, badge: "—" },
  { href: "/reports", label: "Reports", icon: "file" as const },
  { href: "/saved", label: "Saved", icon: "bookmark" as const },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [companyOpen, setCompanyOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [query, setQuery] = useState("");
  const sidebarRef = useRef<HTMLElement>(null);
  const { isMobileNavOpen, setMobileNavOpen, openIssueId } = useUiStore();
  const { activeCompanyId, setActiveCompanyId, setAccessToken, clearSession, actor } = useSessionStore();
  const companiesQuery = useQuery({ queryKey: ["authorized-companies"], queryFn: readCompanies, enabled: true, staleTime: 60_000, retry: false });
  const companies = companiesQuery.data ?? (activeCompanyId ? [{ company_id: activeCompanyId, name: null }] : []);
  const currentCompany = activeCompanyId ?? "workspace";
  const profileName = actor?.fullName || actor?.email || "Workspace user";
  const profileRole = actor?.role ? actor.role.replaceAll("_", " ") : "Workspace member";
  const profileInitial = profileName.trim().slice(0, 1).toUpperCase() || "U";
  async function switchCompany(company: { company_id: string; tenant_id?: string }) {
    if (!company.tenant_id || company.company_id === activeCompanyId) { setActiveCompanyId(company.company_id); setCompanyOpen(false); return; }
    try {
      const response = await axiosClient.post<{ data: { access_token: string } }>(API_ENDPOINTS.authSwitchContext, { tenant_id: company.tenant_id, company_id: company.company_id });
      setAccessToken(response.data.data.access_token); setActiveCompanyId(company.company_id); setCompanyOpen(false); window.location.reload();
    } catch { setCompanyOpen(false); }
  }
  useFocusTrap(sidebarRef, isMobileNavOpen, () => setMobileNavOpen(false));
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
    <div className="app-shell">
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
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={`sidebar-link ${active ? "is-active" : ""}`} onClick={() => setMobileNavOpen(false)}><Icon name={item.icon} /><span>{item.label}</span>{item.badge && <em>{item.badge}</em>}</Link>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/settings" className={`sidebar-link ${pathname.startsWith("/settings") ? "is-active" : ""}`} onClick={() => setMobileNavOpen(false)}><Icon name="settings" /><span>Settings</span></Link>
          {actor?.role === "platform_superadmin" && <Link href="/settings/platform" className={`sidebar-link ${pathname.startsWith("/settings/platform") ? "is-active" : ""}`} onClick={() => setMobileNavOpen(false)}><Icon name="user" /><span>Provisioning</span></Link>}
          <PermissionGate permission="tenant.users.manage"><Link href="/settings/access" className={`sidebar-link ${pathname.startsWith("/settings/access") ? "is-active" : ""}`} onClick={() => setMobileNavOpen(false)}><Icon name="user" /><span>Access</span></Link></PermissionGate>
          <div className="sidebar-status"><span className="status-pulse" /> Intelligence engine ready</div>
        </div>
      </aside>

      <div className="shell-main">
        <header className="app-header">
          <button className="shell-icon-button mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button>
          <div className="company-switcher-wrap">
            <button className="company-switcher" onClick={() => setCompanyOpen(!companyOpen)} aria-expanded={companyOpen}>
              <span className="company-avatar">{currentCompany === "workspace" ? "W" : currentCompany.slice(0, 1).toUpperCase()}</span>
              <span><small>Company scope</small><strong>{currentCompany === "workspace" ? "Workspace company" : currentCompany}</strong></span><Icon name="chevron" size={15} />
            </button>
            {companyOpen && <div className="shell-popover company-popover">{companies.map((company) => <button key={company.company_id} onClick={() => switchCompany(company)}><span className="company-avatar small">{company.company_id.slice(0, 1).toUpperCase()}</span><span><strong>{company.name || company.company_id}</strong><small>Authorized scope</small></span></button>)}</div>}
          </div>
          <div className="header-actions">
            <label className="global-search"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search intelligence..." aria-label="Global search" /><kbd>⌘ K</kbd></label>
            <div className="header-menu-wrap"><button className="shell-icon-button notification-button" onClick={() => setNotificationOpen(!notificationOpen)} aria-label="Notifications" aria-expanded={notificationOpen}><Icon name="bell" /><span /></button>{notificationOpen && <div className="shell-popover notification-popover"><strong>Notifications</strong><p>Your intelligence feed is ready for review.</p><Link href="/alerts" onClick={() => setNotificationOpen(false)}>Open alerts <Icon name="arrow" size={14} /></Link></div>}</div>
            <div className="header-menu-wrap"><button className="profile-button" onClick={() => setUserOpen(!userOpen)} aria-expanded={userOpen}><span className="profile-avatar">{profileInitial}</span><span className="profile-copy"><strong>{profileName}</strong><small>{profileRole}</small></span><Icon name="chevron" size={15} /></button>{userOpen && <div className="shell-popover user-popover"><button><Icon name="user" size={16} /> Profile</button><button onClick={clearSession}><Icon name="logout" size={16} /> Sign out</button></div>}</div>
          </div>
        </header>
        <main className="shell-content" key={pathname}><div className="shell-page-enter">{children}</div></main>
      </div>
      <IssueDetailDrawer />
      {openIssueId && <div className="issue-save-overlay"><SavedIssueControl issueId={openIssueId} /><CompleteIssueControl issueId={openIssueId} /><FeedbackForm targetType="issue" targetId={openIssueId} /></div>}
    </div>
  );
}
