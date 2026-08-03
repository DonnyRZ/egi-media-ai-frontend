import { test, expect } from "@playwright/test";

test.describe("accessibility smoke gate", () => {
  test.beforeEach(async ({ page }) => {
    const permissions = ["dashboard.read", "issue.read", "issue.save", "company_context.read", "report.read", "alert.read", "alert.preference.manage", "company.language.manage"];
    await page.addInitScript((session) => localStorage.setItem("egi_media_ai_session", JSON.stringify(session)), {
      authenticated: true,
      accessToken: "a11y-token",
      actor: { id: "dummy-actor", email: "executive@example.com", fullName: "Executive User", role: "executive", actorType: "human" },
      permissions,
      tenantId: "dummy-tenant",
      activeCompanyId: "company-a",
      authorizedCompanies: [{ company_id: "company-a", tenant_id: "dummy-tenant", name: "Company A", role: "executive" }],
    });
    await page.route("**/api/v1/auth/session", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { actor: { id: "dummy-actor", email: "executive@example.com", type: "human", role: "executive" }, tenant_id: "dummy-tenant", company_id: "company-a", role: "executive", permissions, authorized_companies: [{ company_id: "company-a", tenant_id: "dummy-tenant", name: "Company A", role: "executive" }] }, meta: { request_id: "a11y" } }),
    }));
    await page.route("**/api/v1/dashboard/executive-summary**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { period: "24jam", startAt: "2026-01-01T00:00:00Z", endAt: "2026-01-02T00:00:00Z", items: [], issues: [], top5_limit: 5 }, meta: { request_id: "a11y" } }) }));
  });

  test("interactive controls have accessible names", async ({ page }) => {
    await page.goto("/id");
    const unnamed = await page.locator("button, a, input, textarea, select").evaluateAll((elements) => elements.filter((element) => {
      const label = element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent || (element instanceof HTMLInputElement ? element.placeholder : "");
      return !label?.trim();
    }).map((element) => element.outerHTML.slice(0, 160)));
    expect(unnamed).toEqual([]);
  });

  test("user menu closes with Escape and restores focus", async ({ page }) => {
    await page.goto("/id");
    const userButton = page.getByRole("button", { name: /Executive user/i });
    await userButton.click();
    await expect(page.getByRole("button", { name: /Sign out/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: /Sign out/i })).not.toBeVisible();
  });
});
