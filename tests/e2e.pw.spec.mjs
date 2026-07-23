import { test, expect } from "@playwright/test";

const contextPayload = { context_id: "ctx-1", company_id: "company-a", version: 2, status: "effective", source: "ai_draft", draft_id: "draft-1", fields: { company_name: "Company A", industry: "Technology", description: "Validated company context", competitors: ["Company B"] }, change_reason: null, updated_by: "dummy-actor", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" };
const issue = (id, title) => ({ issue_id: id, title, one_liner: `Validated one-liner for ${title}`, status: "berkembang", priority: "tinggi", first_seen_at: "2026-01-01T00:00:00Z", last_developed_at: "2026-01-02T00:00:00Z", version: 1 });

test.describe("supported primary flows", () => {
  test("dummy login → dashboard → company switch", async ({ page }) => {
    await mockDashboard(page);
    await page.goto("/id/login");
    await page.getByLabel("Work email").fill("executive@example.com");
    await page.getByRole("button", { name: "Continue to workspace" }).click();
    await expect(page).toHaveURL(/\/id$/);
    await expect(page.getByRole("heading", { name: "Executive Summary" })).toBeVisible();
    await page.getByRole("button", { name: /Company scope/ }).click();
    await page.getByRole("button", { name: /Company B/ }).click();
    await expect(page.getByRole("button", { name: /company-b/i })).toBeVisible();
  });

  test("dashboard → issue detail drawer", async ({ page }) => {
    await mockDashboard(page);
    await login(page);
    await page.goto("/id/issues");
    await page.getByRole("button", { name: /Company scope/ }).click();
    await page.getByRole("button", { name: /Company A/ }).click();
    await expect(page.getByRole("button", { name: /company-a/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Issue outside top five/i })).toBeVisible();
    await page.getByRole("button", { name: /Issue outside top five/i }).click();
    await expect(page.getByRole("dialog", { name: "Issue detail" })).toBeVisible();
    await expect(page.getByText("Validated current analysis")).not.toBeVisible();
  });

  test("searches an issue outside Top 5", async ({ page }) => {
    await page.route("**/api/v1/issues**", async (route) => {
      const q = new URL(route.request().url()).searchParams.get("q");
      const items = q ? [issue("issue-12", "Issue outside top five")] : [issue("issue-1", "Top issue")];
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items, meta: { page: 1, limit: 10, total: items.length } }, meta: { request_id: "e2e" } }) });
    });
    await login(page);
    await page.goto("/id/issues");
    await page.getByLabel("Search issues").fill("outside top five");
    await expect(page.getByRole("heading", { name: "Issue outside top five" })).toBeVisible();
  });

  test("Company Context draft → edit → review → approve → effective refresh", async ({ page }) => {
    let draft = { draft_id: "draft-1", company_id: "company-a", status: "draft", is_effective: false, revision: 1, result: { status: "complete", context: { company_name: "Company A", industry: "Technology" } }, review: { submitted_by: null, submitted_at: null, approved_by: null, approved_at: null, note: null }, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
    await page.route("**/api/v1/company-context/draft", async (route) => route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ success: true, data: { draft }, meta: { request_id: "e2e" } }) }));
    await page.route("**/api/v1/company-context/drafts/draft-1", async (route) => {
      if (route.request().method() !== "PATCH") { await route.fallback(); return; }
      draft = { ...draft, revision: draft.revision + 1, result: { ...draft.result, context: { ...draft.result.context, industry: "Finance" } } };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: draft, meta: { request_id: "e2e" } }) });
    });
    await page.route("**/api/v1/company-context/drafts/draft-1/submit-review", async (route) => { draft = { ...draft, status: "in_review", revision: draft.revision + 1 }; await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: draft, meta: { request_id: "e2e" } }) }); });
    await page.route("**/api/v1/company-context/drafts/draft-1/approve", async (route) => { draft = { ...draft, status: "approved", revision: draft.revision + 1 }; await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { draft, effective_context: contextPayload }, meta: { request_id: "e2e" } }) }); });
    await page.route("**/api/v1/companies/company-a/context", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: contextPayload, meta: { request_id: "e2e" } }) }));
    await login(page);
    await page.goto("/id/settings/company-context/draft");
    await page.getByPlaceholder("https://company.example/about").fill("https://company.example/about");
    await page.getByRole("button", { name: "Generate draft" }).click();
    await expect(page.getByText("Review generated fields")).toBeVisible();
    await page.getByLabel("Industry").fill("Finance");
    await page.getByRole("button", { name: "Save edits" }).click();
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page.locator(".context-status-badge").filter({ hasText: "in review" })).toBeVisible();
    await page.getByRole("button", { name: "Approve context" }).click();
    await expect(page.getByText("Approved and effective")).toBeVisible();
  });

  test("logout returns to login", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: /Executive user/ }).click();
    await page.getByRole("button", { name: /Sign out/ }).click();
    await expect(page).toHaveURL(/\/id\/login$/);
  });

  test("save and unsave issue", async ({ page }) => {
    let saved = false;
    await page.route("**/api/v1/saved/issues**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: saved ? [{ saved_id: "saved-1", issue_id: "issue-12", saved_at: "2026-01-02T00:00:00Z", issue: issue("issue-12", "Issue outside top five") }] : [], meta: { page: 1, limit: 100, total: saved ? 1 : 0 } }, meta: { request_id: "e2e" } }) }));
    await page.route("**/api/v1/issues/issue-12/saved", async (route) => { saved = route.request().method() === "POST"; await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { issue_id: "issue-12", saved_at: "2026-01-02T00:00:00Z" }, meta: { request_id: "e2e" } }) }); });
    await mockDashboard(page); await login(page); await page.goto("/id/issues");
    await page.getByRole("button", { name: /Issue outside top five/i }).click();
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
    await page.route("**/api/v1/reports/report-1", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { report, narrative: null, activity: [] }, meta: { request_id: "e2e" } }) }));
    await page.route("**/api/v1/reports/report-1/**", async (route) => { const path = new URL(route.request().url()).pathname; report = { ...report, review_status: path.endsWith("/review") ? "in_review" : path.endsWith("/approve") ? "approved" : "shared", version: report.version + 1 }; await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: report, meta: { request_id: "e2e" } }) }); });
    await login(page); await page.goto("/id/reports"); await page.getByRole("button", { name: /2026-01-01/ }).click();
    await expect(page.getByRole("button", { name: "Submit review" })).toBeVisible(); await page.getByRole("button", { name: "Submit review" }).click();
    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible(); await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByRole("button", { name: "Share" })).toBeVisible(); await page.getByRole("button", { name: "Share" }).click();
  });
});

async function login(page) {
  await page.goto("/id/login");
  await page.getByRole("button", { name: "Continue to workspace" }).click();
  await expect(page).toHaveURL(/\/id$/);
}

async function mockDashboard(page) {
  await page.route("**/api/v1/companies**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [{ company_id: "company-a", name: "Company A" }, { company_id: "company-b", name: "Company B" }] }, meta: { request_id: "e2e" } }) }));
  await page.route("**/api/v1/dashboard/executive-summary**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { period: "24jam", startAt: "2026-01-01T00:00:00Z", endAt: "2026-01-02T00:00:00Z", items: [issue("issue-1", "Top issue")], issues: [issue("issue-1", "Top issue")], top5_limit: 5 }, meta: { request_id: "e2e" } }) }));
  await page.route("**/api/v1/issues**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [issue("issue-12", "Issue outside top five")], meta: { page: 1, limit: 10, total: 1 } }, meta: { request_id: "e2e" } }) }));
  await page.route("**/api/v1/issues/issue-12", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { ...issue("issue-12", "Issue outside top five"), articles: [], developments: [], analysis: null, priority: null }, meta: { request_id: "e2e" } }) }));
}
