import { test, expect } from "@playwright/test";

const COMPANY = { company_id: "company-a", tenant_id: "tenant-a", name: "Company A", status: "active" };
const EXECUTIVE_PERMISSIONS = [
  "dashboard.read", "issue.read", "issue.save", "company_context.read",
  "report.read", "report.approve", "report.share", "alert.read",
  "alert.preference.manage", "company.language.manage",
];
const EXECUTIVE_VIEWER_PERMISSIONS = ["dashboard.read", "issue.read", "issue.save", "company_context.read", "report.read", "alert.read"];

const context = {
  context_id: "context-company-a",
  company_id: "company-a",
  version: 2,
  status: "effective",
  fields: {
    company_name: "Company A",
    industry: "Technology",
    description: "Leadership context for Company A",
    products: ["Enterprise platform"],
    customers: ["Business customers"],
    regions: ["Indonesia"],
    priorities: ["Sustainable growth"],
    competitors: [],
    goals: [],
    risks: [],
    topics: [],
    dependencies: [],
  },
  management_identity: {
    status: "ready",
    context_version: 2,
    company_name: "Company A",
    lens_summary: "Leadership lens for Company A",
    fingerprint: "company-a-fingerprint",
    error_message: null,
    updated_at: "2026-08-01T00:00:00Z",
  },
  updated_by: "user:company-admin@example.com",
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

const baseReport = {
  report_id: "report-executive",
  report_type: "mingguan",
  period_start: "2026-08-01",
  period_end: "2026-08-08",
  timezone: "Asia/Jakarta",
  context_version: 2,
  metrics: { validated_issues: 1 },
  selected_issue_pack: [{ issue_id: "issue-executive" }],
  review_status: "in_review",
  version: 1,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

const reportNarrative = {
  review_status: "draft",
  report_narrative_id: "narrative-executive",
  version: 1,
  narrative: {
    formatVersion: 2,
    executiveSummary: [{ text: "Validated executive narrative", sourceClaimIds: ["claim-executive"] }],
    issueSections: [{ reportItemId: "item-executive", title: "Validated executive signal", priority: "tinggi", status: "berkembang", narrative: { text: "A grounded leadership read.", sourceClaimIds: ["claim-executive"] }, whatHappened: { text: "A validated development occurred.", sourceClaimIds: ["claim-executive"] }, whyImportant: { text: "It may affect the next decision cycle.", sourceClaimIds: ["claim-executive"] }, impact: null, risk: null, watch: [] }],
    impactSections: [],
    periodComparison: { previousPeriod: null, newSignals: [], worsening: [], improving: [] },
    trendSections: [],
    riskOpportunity: { risks: [], opportunities: [], assumptions: [] },
    watchItems: [],
    followUpOptions: [],
    sourceReferences: [{ claimId: "claim-executive", sourceArticleId: "article-executive" }],
  },
};

function response(data) {
  return { success: true, data, meta: { request_id: "executive-role-ux" } };
}

async function seedRole(page, role, permissions) {
  const session = {
    authenticated: true,
    accessToken: `token-${role}`,
    actor: { id: `user:${role}@example.com`, email: `${role}@example.com`, fullName: role === "executive" ? "Executive User" : "Executive Viewer", role, actorType: "human" },
    permissions,
    tenantId: "tenant-a",
    activeCompanyId: "company-a",
    authorizedCompanies: [COMPANY],
  };
  const sessionData = {
    actor: { id: session.actor.id, email: session.actor.email, type: "human", role, membership_id: `membership-${role}` },
    tenant_id: "tenant-a",
    company_id: "company-a",
    role,
    permissions,
    authorized_companies: [COMPANY],
  };

  await page.addInitScript((value) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("egi_media_ai_session", JSON.stringify(value));
  }, session);

  let reportStatus = baseReport.review_status;
  await page.route("**/api/v1/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.pathname;
    const method = route.request().method();
    let data = { items: [], meta: { page: 1, limit: 100, total: 0 } };

    if (path.endsWith("/auth/session")) data = sessionData;
    else if (path === "/api/v1/companies") data = { items: [COMPANY] };
    else if (path === "/api/v1/dashboard/executive-summary") {
      data = {
        period: "24jam",
        startAt: "2026-08-01T00:00:00Z",
        endAt: "2026-08-02T00:00:00Z",
        items: [{ issueId: "issue-executive", title: "Validated executive signal", oneLiner: "A grounded leadership-relevant signal.", status: "berkembang", priority: "tinggi", lastDevelopedAt: "2026-08-01T00:00:00Z" }],
        issues: [],
        top5_limit: 20,
      };
    } else if (path === "/api/v1/news-feed") {
      data = {
        channel: requestUrl.searchParams.get("channel") || "egi_media",
        label: "EGI Media",
        layout: "card",
        provider: "cms",
        items: [{ id: "article-executive", channel: "egi_media", provider: "cms", layout: "card", title: "Validated company signal", summary: "A company-scoped story for executive review.", published_at: "2026-08-01T00:00:00Z", source_url: "https://example.com/story", thumbnail_url: null, crawl_source_id: null, issue_source_id: "cms:article-executive" }],
        next_cursor: null,
      };
    } else if (path === "/api/v1/inbox/emails") data = { items: [], meta: { page: 1, limit: 50, total: 0 } };
    else if (path === "/api/v1/issues") data = { items: [], meta: { page: 1, limit: 10, total: 0 } };
    else if (path === "/api/v1/saved/issues") data = { items: [], meta: { page: 1, limit: 100, total: 0 } };
    else if (path === "/api/v1/reports") data = { items: [{ ...baseReport, review_status: reportStatus }], meta: { page: 1, limit: 50, total: 1 } };
    else if (path === "/api/v1/reports/report-executive") data = { report: { ...baseReport, review_status: reportStatus }, narrative: reportNarrative, activity: [] };
    else if (path.startsWith("/api/v1/reports/report-executive/")) {
      if (path.endsWith("/approve")) reportStatus = "approved";
      data = { report: { ...baseReport, review_status: reportStatus }, narrative: { ...reportNarrative, narrative: { ...reportNarrative.narrative } }, activity: [] };
    } else if (path === "/api/v1/companies/company-a/context" || path === "/api/v1/companies/company-a/context/versions") {
      data = path.endsWith("/versions") ? { items: [context], meta: { total: 1 } } : context;
    } else if (path === "/api/v1/companies/company-a/alert-preference") {
      data = { recipient_id: "company-a-alerts", direct_high_enabled: false, daily_digest_enabled: false, timezone: "Asia/Jakarta", quiet_hours: null };
    } else if (path === "/api/v1/companies/company-a/language-preference") data = { language: "id" };

    await route.fulfill({ status: method === "GET" ? 200 : 200, contentType: "application/json", body: JSON.stringify(response(data)) });
  });
}

test.describe("executive role workspace contract", () => {
  test("executive sees decision surfaces and only its permitted controls", async ({ page }) => {
    await seedRole(page, "executive", EXECUTIVE_PERMISSIONS);

    await page.goto("/id/settings");
    await expect(page.getByRole("link", { name: /^Company Context/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Alert preferences/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Display language/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^News intake/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Companies", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Access", exact: true })).toHaveCount(0);
    await expect(page).toHaveScreenshot("executive-settings-hub.png", { fullPage: true });

    await page.goto("/id/settings/company-context");
    await expect(page.getByTestId("company-context-identity-badge")).toHaveText("ready");
    await expect(page.getByTestId("company-context-revise")).toHaveCount(0);
    await expect(page.getByTestId("company-context-manage-versions")).toBeVisible();
    await expect(page).toHaveScreenshot("executive-company-context-readonly.png", { fullPage: true });

    await page.goto("/id/settings/alert-preferences");
    await page.getByRole("switch", { name: "High alert" }).click();
    await page.getByTestId("alert-preferences-save").click();
    await expect(page.getByRole("status")).toContainText("Preference confirmed");
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    await page.waitForFunction(() => window.scrollY === 0);
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot("executive-alert-preferences.png", { fullPage: true });

    await page.goto("/id/settings/display-language");
    await page.getByTestId("display-language-select").click();
    await page.getByRole("option", { name: "English", exact: true }).click();
    await page.getByTestId("display-language-save").click();
    await expect(page.getByRole("status")).toContainText("saved for this company");
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    await page.waitForFunction(() => window.scrollY === 0);
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot("executive-display-language.png", { fullPage: true });

    await page.goto("/id/reports");
    await expect(page.getByText(/validated issue items/i)).toBeVisible();
    await page.getByText(/01 Aug 2026/).click();
    await expect(page.getByRole("dialog", { name: "Report detail" })).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("button", { name: "Approve" })).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("button", { name: "Submit review" })).toHaveCount(0);
    await page.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Backend confirmed the lifecycle transition.", { exact: true })).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("button", { name: "Share" })).toBeVisible();
    await expect(page).toHaveScreenshot("executive-report-approved.png", { fullPage: true });
    await page.getByRole("dialog").getByRole("button", { name: "Close report detail" }).click();

    for (const [path, title] of [["/id/settings/news-intake", "News intake is restricted"], ["/id/settings/access", "Access restricted"]]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    }
    await page.goto("/id/settings/news-intake");
    await expect(page).toHaveScreenshot("executive-news-intake-restricted.png", { fullPage: true });
  });

  test("executive viewer remains read-only and only sees company context settings", async ({ page }) => {
    await seedRole(page, "executive_viewer", EXECUTIVE_VIEWER_PERMISSIONS);

    await page.goto("/id/settings");
    await expect(page.getByRole("link", { name: /^Company Context/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Alert preferences/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Display language/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^News intake/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Access", exact: true })).toHaveCount(0);
    await expect(page).toHaveScreenshot("executive-viewer-settings-hub.png", { fullPage: true });

    await page.goto("/id/settings/company-context");
    await expect(page.getByTestId("company-context-identity-badge")).toHaveText("ready");
    await expect(page.getByTestId("company-context-revise")).toHaveCount(0);
    await expect(page.getByTestId("company-context-manage-versions")).toBeVisible();

    await page.goto("/id/reports");
    await page.getByText(/01 Aug 2026/).click();
    await expect(page.getByRole("dialog", { name: "Report detail" })).toContainText("read-only for your role");
    await expect(page.getByRole("dialog").getByRole("button", { name: "Approve" })).toHaveCount(0);
    await expect(page.getByRole("dialog").getByRole("button", { name: "Share" })).toHaveCount(0);
    await expect(page.getByRole("dialog").getByRole("button", { name: "Submit review" })).toHaveCount(0);
    await expect(page).toHaveScreenshot("executive-viewer-report-readonly.png", { fullPage: true });

    for (const [path, title] of [["/id/settings/alert-preferences", "Alert preferences restricted"], ["/id/settings/display-language", "Display language restricted"], ["/id/settings/news-intake", "News intake is restricted"], ["/id/settings/access", "Access restricted"]]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    }
    await page.goto("/id/settings/alert-preferences");
    await expect(page).toHaveScreenshot("executive-viewer-alert-preferences-restricted.png", { fullPage: true });
  });
});
