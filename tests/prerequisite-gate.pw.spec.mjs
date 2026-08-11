import { test, expect } from "@playwright/test";
import { loginAsPlatformSuperadmin } from "./support/scope-test-session.mjs";

test.describe("platform scope boundary", () => {
  test("platform superadmin is routed to the control plane instead of customer pages", async ({ page }) => {
    test.setTimeout(90_000);
    await page.route((url) => url.pathname === "/api/v1/platform/tenants", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { items: [], meta: { page: 1, limit: 100, total: 0 } }, meta: { request_id: "scope-test" } }),
    }));
    await loginAsPlatformSuperadmin(page);

    for (const path of ["/id", "/id/issues", "/id/alerts", "/id/reports", "/id/saved", "/id/settings", "/id/settings/companies", "/id/settings/access", "/id/settings/company-context"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/id\/settings\/platform\/?$/, { timeout: 15_000 });
      await expect(page.getByRole("heading", { name: "Customer workspaces" })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId("company-switcher")).toHaveCount(0);
      await expect(page.getByPlaceholder("Search intelligence")).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Platform overview" })).toBeVisible();
    }
  });
});
