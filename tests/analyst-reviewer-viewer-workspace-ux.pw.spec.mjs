import { test, expect } from "@playwright/test";

const COMPANY = { company_id: "company-a", tenant_id: "tenant-a", name: "Company A", status: "active" };
const ANALYST_PERMISSIONS = [
  "dashboard.read", "issue.read", "issue.complete", "issue.save", "company_context.read", "company_context.draft", "company_context.review",
  "report.read", "report.create", "report.review.submit", "report.rewrite", "alert.read", "alert.preference.manage", "company.language.manage",
];
const REVIEWER_PERMISSIONS = ["dashboard.read", "issue.read", "company_context.read", "report.read", "report.review.submit", "report.approve", "report.share", "alert.read"];
const VIEWER_PERMISSIONS = ["dashboard.read", "issue.read", "issue.save", "company_context.read", "report.read", "alert.read"];

const context = {
  context_id: "context-company-a",
  company_id: "company-a",
  version: 2,
  status: "effective",
  fields: { company_name: "Company A", industry: "Technology", description: "Leadership context for Company A", products: ["Enterprise platform"], customers: ["Business customers"], regions: ["Indonesia"], priorities: ["Sustainable growth"], competitors: [], goals: [], risks: [], topics: [], dependencies: [] },
  management_identity: { status: "ready", context_version: 2, company_name: "Company A", lens_summary: "Leadership lens for Company A", fingerprint: "company-a-fingerprint", error_message: null, updated_at: "2026-08-01T00:00:00Z" },
  updated_by: "user:company-admin@example.com",
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

function narrativePayload(version = 1) {
  const point = (text) => ({ text, sourceClaimIds: ["claim-1"] });
  return {
    report_narrative_id: "narrative-company-a",
    report_id: "report-role",
    prompt_version: "t13-v1",
    review_status: "draft",
    version,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    narrative: {
      formatVersion: 2,
      executiveSummary: [point("A validated executive summary.")],
      issueSections: [{ reportItemId: "issue-1", title: "Validated issue", priority: "tinggi", status: "berkembang", narrative: point("A grounded leadership read."), whatHappened: point("A validated development occurred."), whyImportant: point("It may affect the company decision cycle."), impact: point("The operating plan may need review."), risk: point("Delay could increase execution pressure."), watch: [point("Monitor the next validated development.")] }],
      impactSections: [{ title: "Operations", items: [point("Planning is the exposed area.")], impact: null }],
      periodComparison: { previousPeriod: null, newSignals: [], worsening: [], improving: [] },
      trendSections: [],
      riskOpportunity: { risks: [point("Execution pressure may rise.")], opportunities: [], assumptions: [] },
      watchItems: [point("A grounded watch item.")],
      followUpOptions: [point("Review the next evidence update.")],
      sourceReferences: [{ claimId: "claim-1", sourceArticleId: "article-1" }],
    },
  };
}

function makeReport(status) {
  return { report_id: "report-role", report_type: "mingguan", period_start: "2026-08-01", period_end: "2026-08-08", timezone: "Asia/Jakarta", context_version: 2, metrics: { validated_issues: 1 }, selected_issue_pack: [{ issue_id: "issue-1" }], review_status: status, version: 1, created_at: "2026-08-01T00:00:00Z", updated_at: "2026-08-01T00:00:00Z" };
}

async function seedRole(page, role, permissions, reportStatus) {
  const session = {
    authenticated: true,
    accessToken: `role-ux-${role}`,
    actor: { id: `user:${role}@example.com`, email: `${role}@example.com`, fullName: role, role, actorType: "human" },
    permissions,
    tenantId: "tenant-a",
    activeCompanyId: "company-a",
    authorizedCompanies: [COMPANY],
  };
  const sessionData = { actor: { id: session.actor.id, email: session.actor.email, type: "human", role, membership_id: `membership-${role}` }, tenant_id: "tenant-a", company_id: "company-a", role, permissions, authorized_companies: [COMPANY] };
  const report = makeReport(reportStatus);
  let narrativeVersion = 1;
  const requests = [];

  await page.addInitScript((value) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("egi_media_ai_session", JSON.stringify(value));
  }, session);
  await page.route("**/api/v1/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.pathname;
    const method = route.request().method();
    let data = { items: [], meta: { page: 1, limit: 100, total: 0 } };

    if (path.endsWith("/auth/session")) data = sessionData;
    else if (path === "/api/v1/companies") data = { items: [COMPANY] };
    else if (path === "/api/v1/dashboard/executive-summary") data = { period: "24jam", startAt: "2026-08-01T00:00:00Z", endAt: "2026-08-02T00:00:00Z", items: [], issues: [], top5_limit: 20 };
    else if (path === "/api/v1/news-feed") data = { channel: "egi_media", label: "EGI Media", layout: "card", provider: "cms", items: [], next_cursor: null };
    else if (path === "/api/v1/inbox/emails") data = { items: [], meta: { page: 1, limit: 50, total: 0 } };
    else if (path === "/api/v1/companies/company-a/context") data = context;
    else if (path === "/api/v1/companies/company-a/context/versions") data = { items: [context], meta: { total: 1 } };
    else if (path === "/api/v1/reports") data = { items: [report], meta: { page: 1, limit: 50, total: 1 } };
    else if (path === "/api/v1/reports/report-role") data = { report, narrative: narrativePayload(narrativeVersion), activity: [] };
    else if (path === "/api/v1/reports/report-role/narrative/narrative-company-a/rewrite") {
      requests.push({ method, path, headers: route.request().headers(), body: method === "POST" ? route.request().postDataJSON() : null });
      narrativeVersion += 1;
      data = { narrative: narrativePayload(narrativeVersion), rewritten_span: { span_id: "issue_narrative:issue-1", source_claim_ids: ["claim-1"] }, reused: false };
    } else if (path.startsWith("/api/v1/reports/report-role/")) {
      requests.push({ method, path, headers: route.request().headers(), body: method === "POST" ? route.request().postDataJSON() : null });
      if (path.endsWith("/review")) report.review_status = "in_review";
      if (path.endsWith("/approve")) report.review_status = "approved";
      data = { report, narrative: narrativePayload(narrativeVersion), activity: [] };
    } else if (path === "/api/v1/companies/company-a/alert-preference") data = { recipient_id: "company-a-alerts", direct_high_enabled: false, daily_digest_enabled: false, timezone: "Asia/Jakarta", quiet_hours: null };
    else if (path === "/api/v1/companies/company-a/language-preference") data = { language: "id" };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data, meta: { request_id: "role-ux" } }) });
  });
  return { requests };
}

test.describe("analyst, reviewer, and viewer role contract", () => {
  test("analyst can prepare context, submit a report, and use constrained rewrite", async ({ page }) => {
    const { requests } = await seedRole(page, "analyst", ANALYST_PERMISSIONS, "draft");

    await page.goto("/id/settings");
    await expect(page.getByRole("link", { name: /^Company Context/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Alert preferences/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Display language/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^News intake/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Access", exact: true })).toHaveCount(0);
    await expect(page).toHaveScreenshot("analyst-settings-hub.png", { fullPage: true });

    await page.goto("/id/settings/company-context");
    await expect(page.getByTestId("company-context-revise")).toBeVisible();
    await expect(page.getByTestId("company-context-manage-versions")).toBeVisible();
    await page.goto("/id/settings/company-context/versions");
    await expect(page.getByRole("link", { name: "Create revision" })).toBeVisible();
    await expect(page).toHaveScreenshot("analyst-context-versions.png", { fullPage: true });

    await page.goto("/id/reports");
    await page.getByText(/01 Aug 2026/).click();
    await expect(page.getByRole("dialog", { name: "Report detail" }).getByRole("button", { name: "Submit review" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Issue narrative/ })).toBeVisible();
    await page.getByRole("button", { name: /Issue narrative/ }).click();
    await expect(page.getByRole("heading", { name: "Constrained rewrite" })).toBeVisible();
    await page.getByLabel("Bounded instruction").fill("Make this sentence more concise without adding facts.");
    await page.getByRole("button", { name: "Preview rewrite" }).click();
    await expect(page.getByRole("heading", { name: "Review the requested change" })).toBeVisible();
    await expect(page).toHaveScreenshot("analyst-rewrite-preview.png", { fullPage: true });
    await page.getByRole("button", { name: "Apply rewrite" }).click();
    await expect(page.getByRole("status")).toContainText("Rewrite applied at version 2");
    const rewriteRequest = requests.find((request) => request.path.endsWith("/rewrite"));
    expect(rewriteRequest).toBeTruthy();
    expect(rewriteRequest.body).toMatchObject({ allowed_span_id: "issue_narrative:issue-1", instruction: "Make this sentence more concise without adding facts.", version: 1 });
    expect(rewriteRequest.headers["if-match"]).toBe("1");
    expect(rewriteRequest.headers["idempotency-key"]).toMatch(/^report-rewrite-/);
    await expect(page).toHaveScreenshot("analyst-rewrite-applied.png", { fullPage: true });
  });

  test("reviewer can approve but cannot edit context or rewrite narrative", async ({ page }) => {
    await seedRole(page, "reviewer", REVIEWER_PERMISSIONS, "in_review");

    await page.goto("/id/settings");
    await expect(page.getByRole("link", { name: /^Company Context/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Alert preferences/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Display language/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^News intake/ })).toHaveCount(0);
    await expect(page).toHaveScreenshot("reviewer-settings-hub.png", { fullPage: true });

    await page.goto("/id/settings/company-context");
    await expect(page.getByTestId("company-context-revise")).toHaveCount(0);
    await expect(page.getByTestId("company-context-manage-versions")).toBeVisible();

    await page.goto("/id/reports");
    await page.getByText(/01 Aug 2026/).click();
    await expect(page.getByRole("dialog", { name: "Report detail" }).getByRole("button", { name: "Approve" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Issue narrative/ })).toHaveCount(0);
    await page.getByRole("dialog", { name: "Report detail" }).getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Backend confirmed the lifecycle transition.", { exact: true })).toBeVisible();
  });

  test("viewer stays read-only and receives honest forbidden states for management pages", async ({ page }) => {
    await seedRole(page, "viewer", VIEWER_PERMISSIONS, "draft");

    await page.goto("/id/settings");
    await expect(page.getByRole("link", { name: /^Company Context/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Alert preferences/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Display language/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^News intake/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Access", exact: true })).toHaveCount(0);
    await expect(page).toHaveScreenshot("viewer-settings-hub.png", { fullPage: true });

    await page.goto("/id/settings/company-context");
    await expect(page.getByTestId("company-context-revise")).toHaveCount(0);
    await expect(page.getByTestId("company-context-manage-versions")).toBeVisible();

    await page.goto("/id/reports");
    await page.getByText(/01 Aug 2026/).click();
    await expect(page.getByRole("dialog", { name: "Report detail" })).toContainText("read-only for your role");
    await expect(page.getByRole("dialog").getByRole("button", { name: "Approve" })).toHaveCount(0);
    await expect(page.getByRole("dialog").getByRole("button", { name: "Submit review" })).toHaveCount(0);

    for (const [path, title] of [["/id/settings/alert-preferences", "Alert preferences restricted"], ["/id/settings/display-language", "Display language restricted"], ["/id/settings/news-intake", "News intake is restricted"], ["/id/settings/access", "Access restricted"]]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    }
  });
});
