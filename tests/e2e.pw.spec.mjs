import { test, expect } from "@playwright/test";
import { newsFeedChannelsResponse } from "./support/news-feed-channels.mjs";

const contextPayload = {
  context_id: "ctx-1",
  company_id: "company-a",
  version: 2,
  status: "effective",
  source: "ai_draft",
  draft_id: "draft-1",
  fields: {
    company_name: "Company A",
    industry: "Technology",
    description: "Validated company context",
    competitors: ["Company B"],
  },
  change_reason: null,
  updated_by: "dummy-actor",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  management_identity: {
    status: "ready",
    context_version: 2,
    company_name: "Company A",
    lens_summary: "Leadership lens for Company A",
    fingerprint: "fp-1",
    error_message: null,
    updated_at: "2026-01-02T00:00:00Z",
  },
};
const issue = (id, title) => ({ issue_id: id, title, one_liner: `Validated one-liner for ${title}`, status: "berkembang", priority: "tinggi", first_seen_at: "2026-01-01T00:00:00Z", last_developed_at: "2026-01-02T00:00:00Z", version: 1 });

test.describe("supported primary flows", () => {
  test("dummy login → dashboard → company switch", async ({ page }) => {
    await mockDashboard(page);
    await login(page);
    await expect(page.getByRole("heading", { name: "Executive Summary" })).toBeVisible();
    await page.getByRole("button", { name: /Company scope/ }).click();
    await page.getByTestId("company-switcher-option").filter({ hasText: "Company B" }).click();
    await expect(page.getByTestId("company-switcher")).toContainText("Company B");
  });

  test("dashboard → issue detail drawer", async ({ page }) => {
    await mockDashboard(page);
    await login(page);
    await page.goto("/id");
    await page.getByRole("button", { name: /Company scope/ }).click();
    await page.getByTestId("company-switcher-option").filter({ hasText: "Company A" }).click();
    await expect(page.getByTestId("company-switcher")).toContainText("Company A");
    await expect(page.getByRole("button", { name: /Top issue/i })).toBeVisible();
    await page.getByRole("button", { name: /Top issue/i }).click();
    await expect(page.getByRole("dialog", { name: "Issue detail" })).toBeVisible();
    await expect(page.getByText("Validated current analysis")).not.toBeVisible();
  });

  test("news feed default channel and search", async ({ page }) => {
    await mockDashboard(page);
    await login(page);
    await page.goto("/id/issues");
    await expect(page.getByRole("heading", { name: "News Feed" })).toBeVisible();
    const egiTab = page.locator('[data-testid="news-feed-tabs"] button[data-channel="egi_media"]');
    await expect(egiTab).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { name: "EGI Media headline" })).toBeVisible();
    await page.getByLabel("Search news feed").fill("headline");
    await expect(page.getByRole("heading", { name: "EGI Media headline" })).toBeVisible();
  });

  test("Company Context draft → edit → Save → effective refresh", async ({ page }) => {
    let draft = { draft_id: "draft-1", company_id: "company-a", status: "draft", is_effective: false, revision: 1, result: { status: "complete", context: { name: "Company A", industry: "Technology", description: "A validated technology company profile.", products: ["Software platform"], customers: ["Enterprise customers"], regions: ["Indonesia"], priorities: ["Reliable growth"], sub_industry: null, competitors: [], goals: [], risks: [], topics: [], dependencies: [] }, field_review: { name: "user_confirmed", industry: "user_confirmed", description: "user_confirmed", products: "user_confirmed", customers: "user_confirmed", regions: "user_confirmed", priorities: "user_confirmed", sub_industry: "reviewed_none_disclosed", competitors: "reviewed_none_disclosed", goals: "reviewed_none_disclosed", risks: "reviewed_none_disclosed", topics: "reviewed_none_disclosed", dependencies: "reviewed_none_disclosed" } }, review: { submitted_by: null, submitted_at: null, approved_by: null, approved_at: null, note: null }, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
    const ownerPermissions = [
      "dashboard.read", "issue.read", "issue.save",
      "company_context.read", "company_context.draft", "company_context.approve",
    ];
    await page.addInitScript((permissions) => {
      localStorage.setItem("egi_media_ai_session", JSON.stringify({
        authenticated: true,
        accessToken: "e2e-owner-token",
        actor: { id: "owner-1", email: "owner@example.com", fullName: "Owner User", role: "tenant_owner", actorType: "human" },
        permissions,
        tenantId: "tenant-a",
        activeCompanyId: "company-a",
        authorizedCompanies: [{ company_id: "company-a", name: "Company A", tenant_id: "tenant-a" }],
      }));
    }, ownerPermissions);
    await page.route("**/api/v1/auth/session", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          actor: { id: "owner-1", email: "owner@example.com", type: "human", role: "tenant_owner", membership_id: "m-1" },
          tenant_id: "tenant-a",
          company_id: "company-a",
          role: "tenant_owner",
          permissions: ownerPermissions,
          authorized_companies: [{ company_id: "company-a", name: "Company A", tenant_id: "tenant-a" }],
        },
        meta: { request_id: "e2e" },
      }),
    }));
    await page.route("**/api/v1/companies/*/language-preference**", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { language: "en" }, meta: { request_id: "e2e" } }),
    }));
    await page.route("**/api/v1/company-context/draft", async (route) => route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ success: true, data: { draft }, meta: { request_id: "e2e" } }) }));
    await page.route("**/api/v1/company-context/drafts/draft-1", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: draft, meta: { request_id: "e2e" } }) });
        return;
      }
      if (route.request().method() !== "PATCH") { await route.fallback(); return; }
      draft = { ...draft, revision: draft.revision + 1, result: { ...draft.result, context: { ...draft.result.context, industry: "Finance" } } };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: draft, meta: { request_id: "e2e" } }) });
    });
    await page.route("**/api/v1/company-context/drafts/draft-1/approve", async (route) => {
      draft = { ...draft, status: "approved", revision: draft.revision + 1 };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            draft,
            effective_context: contextPayload,
            management_identity: contextPayload.management_identity,
          },
          meta: { request_id: "e2e" },
        }),
      });
    });
    await page.route("**/api/v1/companies/company-a/context", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: contextPayload, meta: { request_id: "e2e" } }) }));
    await page.goto("/id/settings/company-context/draft");
    await expect(page.getByRole("heading", { name: "Build Company Context" })).toBeVisible();
    await page.getByRole("tab", { name: "URL" }).click();
    await page.getByPlaceholder("https://company.example/about").fill("https://company.example/about");
    await page.getByRole("button", { name: "Generate draft" }).click();
    await expect(page.getByText("Review generated fields")).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveScreenshot("tenant-context-draft-generated.png");
    await expect(page.getByRole("button", { name: "Submit for review" })).toHaveCount(0);
    await page.getByLabel("Industry field", { exact: true }).fill("Finance");
    await page.getByTestId("context-draft-save").click();
    await expect(page.getByText(/Context saved and activated/i)).toBeVisible();
    await expect(page.getByTestId("context-draft-identity-status")).toContainText(/ready/i);
    await expect(page.locator(".context-status-badge").filter({ hasText: "active" })).toBeVisible();
    await expect(page.getByTestId("context-approved-state").getByText("Context active", { exact: true })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveScreenshot("tenant-context-draft-saved.png");
  });

  test("logout returns to login", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: /executive@example.com/i }).click();
    await page.getByRole("button", { name: /Sign out/ }).click();
    await expect(page).toHaveURL(/\/id\/login$/);
  });

  test("save and unsave issue", async ({ page }) => {
    let saved = false;
    await page.route("**/api/v1/saved/issues**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: saved ? [{ saved_id: "saved-1", issue_id: "issue-1", saved_at: "2026-01-02T00:00:00Z", issue: issue("issue-1", "Top issue") }] : [], meta: { page: 1, limit: 100, total: saved ? 1 : 0 } }, meta: { request_id: "e2e" } }) }));
    await page.route("**/api/v1/issues/issue-1/saved", async (route) => { saved = route.request().method() === "POST"; await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { issue_id: "issue-1", saved_at: "2026-01-02T00:00:00Z" }, meta: { request_id: "e2e" } }) }); });
    await mockDashboard(page); await login(page); await page.goto("/id");
    await page.getByRole("button", { name: /Top issue/i }).click();
    await expect(page.getByRole("button", { name: "Save issue" })).toBeVisible();
    await page.getByRole("button", { name: "Save issue" }).click();
    await expect(page.getByRole("button", { name: "Unsave issue" })).toBeVisible();
    await page.getByRole("button", { name: "Unsave issue" }).click();
    await expect(page.getByRole("button", { name: "Save issue" })).toBeVisible();
  });

  test("alert inbox links to issue", async ({ page }) => {
    await page.route("**/api/v1/inbox/emails**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [{ email_id: "email-1", issue_id: "issue-12", development_id: "dev-1", channel: "langsung", status: "sent", reason_code: "new_development", read: false, created_at: "2026-01-02T00:00:00Z" }], meta: { page: 1, limit: 50, total: 1 } }, meta: { request_id: "e2e" } }) }));
    await mockDashboard(page); await login(page); await page.goto("/id/alerts");
    await expect(page.getByRole("button", { name: "Open issue" })).toBeVisible();
    await page.getByRole("button", { name: "Open issue" }).click();
    await expect(page.getByRole("dialog", { name: "Issue detail" })).toBeVisible();
  });

  test("report review → approve → share", async ({ page }) => {
    let report = { report_id: "report-1", report_type: "mingguan", period_start: "2026-01-01", period_end: "2026-01-08", timezone: "Asia/Jakarta", context_version: 1, metrics: {}, selected_issue_pack: [{ issue_id: "issue-12" }], review_status: "draft", version: 1, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
    await page.route("**/api/v1/reports**", async (route) => { if (new URL(route.request().url()).pathname !== "/api/v1/reports") return route.fallback(); await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [report], meta: { page: 1, limit: 50, total: 1 } }, meta: { request_id: "e2e" } }) }); });
    await page.route("**/api/v1/reports/report-1", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { report, narrative: { review_status: "draft", narrative: { executive_summary: "Validated narrative" } }, activity: [] }, meta: { request_id: "e2e" } }) }));
    await page.route("**/api/v1/reports/report-1/**", async (route) => { const path = new URL(route.request().url()).pathname; report = { ...report, review_status: path.endsWith("/review") ? "in_review" : path.endsWith("/approve") ? "approved" : "shared", version: report.version + 1 }; await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: report, meta: { request_id: "e2e" } }) }); });
    await login(page); await page.goto("/id/reports"); await page.getByRole("button", { name: /01 Jan 2026/ }).click();
    await expect(page.getByRole("button", { name: "Submit review" })).toBeVisible(); await page.getByRole("button", { name: "Submit review" }).click();
    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible(); await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByRole("button", { name: "Share" })).toBeVisible(); await page.getByRole("button", { name: "Share" }).click();
  });
});

async function login(page) {
  const permissions = ["dashboard.read", "issue.read", "issue.save", "company_context.read", "company_context.draft", "company_context.review", "company_context.approve", "report.read", "report.review.submit", "report.approve", "report.share", "alert.read", "alert.preference.manage", "company.language.manage"];
  let activeCompany = "company-a";
  const company = (companyId) => companyId === "company-b" ? { company_id: "company-b", tenant_id: "tenant-a", name: "Company B", role: "tenant_owner" } : { company_id: "company-a", tenant_id: "tenant-a", name: "Company A", role: "tenant_owner" };
  const sessionBody = () => ({ success: true, data: { actor: { id: "owner-1", email: "executive@example.com", type: "human", role: "tenant_owner", membership_id: "m-1" }, tenant_id: "tenant-a", company_id: activeCompany, role: "tenant_owner", permissions, authorized_companies: [company("company-a"), company("company-b")] }, meta: { request_id: "e2e" } });
  await page.route("**/api/v1/auth/login", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { access_token: "e2e-owner-token", token_type: "Bearer", actor: { id: "owner-1", email: "executive@example.com", role: "tenant_owner", type: "human" }, tenant_id: "tenant-a", company_id: activeCompany, permissions, authorized_companies: [company("company-a"), company("company-b")] }, meta: { request_id: "e2e" } }) }));
  await page.route("**/api/v1/auth/session", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessionBody()) }));
  await page.route("**/api/v1/auth/switch-context", async (route) => { activeCompany = "company-b"; await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { access_token: "e2e-company-b-token", token_type: "Bearer", tenant_id: "tenant-a", company_id: activeCompany, role: "tenant_owner", permissions, company_name: "Company B" }, meta: { request_id: "e2e" } }) }); });
  await page.goto("/id/login");
  await page.getByLabel("Work email").fill("executive@example.com");
  await page.getByLabel("Password").fill("e2e-password");
  await page.getByRole("button", { name: "Continue to workspace" }).click();
  await expect(page).toHaveURL(/\/id$/);
}

async function mockDashboard(page) {
  const summaryItem = {
    issueId: "issue-1",
    title: "Top issue",
    oneLiner: "Validated one-liner for Top issue",
    status: "berkembang",
    priority: "tinggi",
    lastDevelopedAt: "2026-01-02T00:00:00Z",
  };
  await page.route("**/api/v1/companies**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [{ company_id: "company-a", name: "Company A" }, { company_id: "company-b", name: "Company B" }] }, meta: { request_id: "e2e" } }) }));
  await page.route("**/api/v1/dashboard/executive-summary**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { period: "24jam", startAt: "2026-01-01T00:00:00Z", endAt: "2026-01-02T00:00:00Z", items: [summaryItem], issues: [summaryItem], top5_limit: 5 }, meta: { request_id: "e2e" } }) }));
  await page.route("**/api/v1/issues**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [issue("issue-12", "Issue outside top five")], meta: { page: 1, limit: 10, total: 1 } }, meta: { request_id: "e2e" } }) }));
  await page.route("**/api/v1/issues/issue-1", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { ...issue("issue-1", "Top issue"), articles: [], developments: [], analysis: null, priority: null }, meta: { request_id: "e2e" } }) }));
  await page.route("**/api/v1/issues/issue-12", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { ...issue("issue-12", "Issue outside top five"), articles: [], developments: [], analysis: null, priority: null }, meta: { request_id: "e2e" } }) }));
  await mockNewsFeed(page);
}

async function mockNewsFeed(page) {
  await page.route("**/api/v1/news-feed**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes("/news-feed/channels")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(newsFeedChannelsResponse()),
      });
      return;
    }
    const channel = url.searchParams.get("channel") || "egi_media";
    if (channel === "viral") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            channel: "viral",
            label: "Viral",
            layout: "text",
            provider: "viral_x",
            items: [],
            next_cursor: null,
            availability: "coming_soon",
            message: "Coming soon",
          },
          meta: { request_id: "e2e" },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          channel,
          label: channel === "egi_media" ? "EGI Media" : channel,
          layout: "card",
          provider: channel === "egi_media" ? "cms" : "crawl",
          items: [
            {
              id: "cms:article-1",
              channel,
              provider: channel === "egi_media" ? "cms" : "crawl",
              layout: "card",
              title: "EGI Media headline",
              summary: "A validated feed summary for the news feed card layout.",
              published_at: "2026-01-02T00:00:00Z",
              source_url: "https://example.com/story",
              thumbnail_url: "https://example.com/thumb.jpg",
              crawl_source_id: null,
              issue_source_id: "cms:article-1",
            },
          ],
          next_cursor: null,
        },
        meta: { request_id: "e2e" },
      }),
    });
  });
}
