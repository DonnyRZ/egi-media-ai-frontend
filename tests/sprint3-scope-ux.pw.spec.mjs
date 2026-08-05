import { test, expect } from "@playwright/test";
import { loginAsPlatformSuperadmin } from "./support/scope-test-session.mjs";

test.describe("platform operational-surface boundary", () => {
  test("the platform shell replaces customer navigation and search", async ({ page }) => {
    await page.route((url) => url.pathname === "/api/v1/platform/tenants", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { items: [], meta: { page: 1, limit: 100, total: 0 } } }),
    }));
    await loginAsPlatformSuperadmin(page);
    await expect(page.getByRole("link", { name: "Platform overview" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Executive Summary" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "News Feed" })).toHaveCount(0);
    await expect(page.getByPlaceholder("Search intelligence")).toHaveCount(0);
    await expect(page.getByText("Control plane ready")).toBeVisible();
  });

  test("direct customer workspace routes return to platform overview", async ({ page }) => {
    test.setTimeout(60_000);
    await page.route((url) => url.pathname === "/api/v1/platform/tenants", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { items: [], meta: { page: 1, limit: 100, total: 0 } } }),
    }));
    await loginAsPlatformSuperadmin(page);
    for (const path of ["/id", "/id/issues", "/id/alerts", "/id/reports", "/id/saved"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/id\/settings\/platform\/?$/, { timeout: 15_000 });
      await expect(page.getByRole("heading", { name: "Workspace registry" })).toBeVisible();
    }
  });
});
