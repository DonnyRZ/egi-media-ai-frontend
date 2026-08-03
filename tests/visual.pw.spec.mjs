import { test, expect } from "@playwright/test";

test.describe("visual regression surfaces", () => {
  test.beforeEach(async ({ page }) => {
    await page.addStyleTag({ content: "[data-next-badge-root], nextjs-portal { display: none !important; }" });
    const permissions = ["dashboard.read", "issue.read", "issue.save", "company_context.read", "alert.read", "alert.preference.manage", "company.language.manage", "report.read"];
    await page.addInitScript((sessionPermissions) => localStorage.setItem("egi_media_ai_session", JSON.stringify({ authenticated: true, accessToken: "visual-token", actor: { id: "dummy-actor", email: "executive@example.com", fullName: "Executive User", role: "executive", actorType: "human" }, permissions: sessionPermissions, tenantId: "dummy-tenant", activeCompanyId: "company-a", authorizedCompanies: [{ company_id: "company-a", tenant_id: "dummy-tenant", name: "Company A" }] })), permissions);
    await page.route("**/api/v1/auth/session", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { actor: { id: "dummy-actor", email: "executive@example.com", type: "human", role: "executive", membership_id: "membership-1" }, tenant_id: "dummy-tenant", company_id: "company-a", role: "executive", permissions, authorized_companies: [{ company_id: "company-a", tenant_id: "dummy-tenant", name: "Company A" }] }, meta: { request_id: "visual" } }) }));
    await page.route("**/api/v1/companies", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [{ company_id: "company-a", tenant_id: "dummy-tenant", name: "Company A" }] }, meta: { request_id: "visual" } }) }));
    await page.route("**/api/v1/dashboard/executive-summary**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { period: "24jam", startAt: "2026-01-01T00:00:00Z", endAt: "2026-01-02T00:00:00Z", items: [], issues: [], top5_limit: 5 }, meta: { request_id: "visual" } }) }));
    await page.route("**/api/v1/inbox/emails**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [], meta: { page: 1, limit: 50, total: 0 } }, meta: { request_id: "visual" } }) }));
    await page.route("**/api/v1/reports**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [], meta: { page: 1, limit: 50, total: 0 } }, meta: { request_id: "visual" } }) }));
    await page.route("**/api/v1/saved/issues**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [], meta: { page: 1, limit: 100, total: 0 } }, meta: { request_id: "visual" } }) }));
    await page.route("**/api/v1/companies/**/context", async (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "PROVIDER_UNAVAILABLE", message: "Temporarily unavailable" }, meta: { request_id: "visual" } }) }));
  });

  for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "tablet", width: 900, height: 1100 }, { name: "mobile", width: 390, height: 844 }]) {
    test(`dashboard ${viewport.name}`, async ({ page }) => { await page.setViewportSize({ width: viewport.width, height: viewport.height }); await page.goto("/id"); await expect(page.getByText("No active signals in this period")).toBeVisible(); await expect(page).toHaveScreenshot(`dashboard-${viewport.name}.png`, { fullPage: true }); });
  }

  test("settings surface", async ({ page }) => { await page.goto("/id/settings"); await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible(); await expect(page).toHaveScreenshot("settings-desktop.png", { fullPage: true }); });
  test("alerts empty state", async ({ page }) => { await page.goto("/id/alerts"); await expect(page.getByText("No archived alerts")).toBeVisible(); await expect(page).toHaveScreenshot("alerts-unavailable.png", { fullPage: true }); });
  test("reports empty state", async ({ page }) => { await page.goto("/id/reports"); await expect(page.getByText("No reports yet")).toBeVisible(); await expect(page).toHaveScreenshot("reports-unavailable.png", { fullPage: true }); });
  test("loading and error state primitives", async ({ page }) => { await page.goto("/id/settings/company-context"); await expect(page.getByRole("heading", { name: "Company Context", exact: true })).toBeVisible(); await expect(page).toHaveScreenshot("company-context-state.png", { fullPage: true }); });

  test("issue detail drawer", async ({ page }) => {
    await page.route("**/api/v1/issues/issue-visual", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { issue_id: "issue-visual", title: "Visual issue detail", one_liner: "A validated issue detail for visual review", status: "berkembang", priority: "tinggi", version: 1, first_seen_at: "2026-01-01T00:00:00Z", last_developed_at: "2026-01-02T00:00:00Z", articles: [], developments: [], analysis: null, priority_analysis: null }, meta: { request_id: "visual" } }) }));
    await page.route("**/api/v1/dashboard/executive-summary**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { period: "24jam", startAt: "2026-01-01T00:00:00Z", endAt: "2026-01-02T00:00:00Z", items: [{ issueId: "issue-visual", title: "Visual issue detail", oneLiner: "A validated issue detail for visual review", status: "berkembang", priority: "tinggi", lastDevelopedAt: "2026-01-02T00:00:00Z" }], issues: [], top5_limit: 5 }, meta: { request_id: "visual" } }) }));
    await page.goto("/id");
    await page.getByRole("button", { name: /Visual issue detail/i }).click();
    await expect(page.getByRole("dialog", { name: "Issue detail" })).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Visual issue detail" })).toBeVisible();
    await expect(page).toHaveScreenshot("issue-drawer-desktop.png", { fullPage: true });
  });
});
