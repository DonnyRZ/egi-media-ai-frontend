"use client";

import dynamic from "next/dynamic";
import type { ComponentType, ReactNode } from "react";

import { SettingsHub } from "@/shared/settings-hub";

const ExecutiveSummary = dynamic(() => import("@/shared/executive-summary").then((m) => m.ExecutiveSummary), { ssr: false, loading: () => null });
const NewsFeed = dynamic(() => import("@/shared/news-feed").then((m) => m.NewsFeed), { ssr: false, loading: () => null });
const AlertsInbox = dynamic(() => import("@/shared/alerts-inbox").then((m) => m.AlertsInbox), { ssr: false, loading: () => null });
const ReportsWorkspace = dynamic(() => import("@/shared/reports-workspace").then((m) => m.ReportsWorkspace), { ssr: false, loading: () => null });
const SavedIssues = dynamic(() => import("@/shared/saved-issues").then((m) => m.SavedIssues), { ssr: false, loading: () => null });
const PlatformProvisioning = dynamic(() => import("@/shared/platform-provisioning").then((m) => m.PlatformProvisioning), { ssr: false, loading: () => null });
const AccessManagement = dynamic(() => import("@/shared/access-management").then((m) => m.AccessManagement), { ssr: false, loading: () => null });
const TenantCompanyManagement = dynamic(() => import("@/shared/tenant-company-management").then((m) => m.TenantCompanyManagement), { ssr: false, loading: () => null });
const CompanyContextRead = dynamic(() => import("@/shared/company-context-read").then((m) => m.CompanyContextRead), { ssr: false, loading: () => null });
const CompanyContextDraftFlow = dynamic(() => import("@/shared/company-context-draft-flow").then((m) => m.CompanyContextDraftFlow), { ssr: false, loading: () => null });
const AlertPreferences = dynamic(() => import("@/shared/alert-preferences").then((m) => m.AlertPreferences), { ssr: false, loading: () => null });
const NewsIntake = dynamic(() => import("@/shared/news-intake").then((m) => m.NewsIntake), { ssr: false, loading: () => null });
const DisplayLanguage = dynamic(() => import("@/shared/display-language").then((m) => m.DisplayLanguage), { ssr: false, loading: () => null });

const VIEWS: Record<string, ComponentType> = {
  "/": ExecutiveSummary,
  "/issues": NewsFeed,
  "/alerts": AlertsInbox,
  "/reports": ReportsWorkspace,
  "/saved": SavedIssues,
  "/settings": SettingsHub,
  "/settings/companies": TenantCompanyManagement,
  "/settings/company-context": CompanyContextRead,
  "/settings/company-context/draft": CompanyContextDraftFlow,
  "/settings/alert-preferences": AlertPreferences,
  "/settings/news-intake": NewsIntake,
  "/settings/display-language": DisplayLanguage,
  "/settings/platform": PlatformProvisioning,
  "/settings/access": AccessManagement,
};

/** Instant destination UI while Next soft-nav RSC catches up. */
export function OptimisticNavView({ href }: { href: string }): ReactNode {
  const View = VIEWS[href];
  return View ? <View /> : null;
}

export function hasOptimisticNavView(href: string) {
  return Boolean(VIEWS[href]);
}

/** Warm dynamic chunks so the first optimistic paint is not chunk-bound. */
export function prefetchOptimisticNavViews() {
  void import("@/shared/executive-summary");
  void import("@/shared/news-feed");
  void import("@/shared/alerts-inbox");
  void import("@/shared/reports-workspace");
  void import("@/shared/saved-issues");
  void import("@/shared/platform-provisioning");
  void import("@/shared/access-management");
  void import("@/shared/tenant-company-management");
  void import("@/shared/company-context-read");
  void import("@/shared/company-context-draft-flow");
  void import("@/shared/alert-preferences");
  void import("@/shared/news-intake");
  void import("@/shared/display-language");
}

export function toLocalePath(href: string, locale = "id") {
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}
