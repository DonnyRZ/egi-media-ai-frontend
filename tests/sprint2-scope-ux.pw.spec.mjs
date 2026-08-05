import { test, expect } from "@playwright/test";
import { loginAsPlatformSuperadmin } from "./support/scope-test-session.mjs";

test.describe("platform boundary around customer-scoped settings", () => {
  test("company context, draft, alerts, and intake never mount in the platform shell", async ({ page }) => {
    await page.route((url) => url.pathname === "/api/v1/platform/tenants", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { items: [], meta: { page: 1, limit: 100, total: 0 } } }),
    }));
    await loginAsPlatformSuperadmin(page);
    for (const path of ["/id/settings/company-context", "/id/settings/company-context/draft", "/id/settings/alert-preferences", "/id/settings/news-intake"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/id\/settings\/platform\/?$/, { timeout: 15_000 });
      await expect(page.getByRole("heading", { name: "Workspace registry" })).toBeVisible();
      await expect(page.getByRole("heading", { name: /Build Company Context|Alert preferences|News intake/i })).toHaveCount(0);
    }
  });

  test("the unscoped platform state explains itself without rendering empty customer data", async ({ page }) => {
    await page.route((url) => url.pathname === "/api/v1/platform/tenants", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { items: [], meta: { page: 1, limit: 100, total: 0 } } }),
    }));
    await loginAsPlatformSuperadmin(page);
    await expect(page.getByText("Platform control plane")).toBeVisible();
    await expect(page.getByText("Provision and operate customer workspaces from one registry.")).toBeVisible();
    await expect(page.getByText("No active signals in this period")).toHaveCount(0);
    await expect(page.getByText("No stories yet")).toHaveCount(0);
  });
});
