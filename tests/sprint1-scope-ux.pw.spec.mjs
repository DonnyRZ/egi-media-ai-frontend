import { test, expect } from "@playwright/test";
import { loginAsPlatformSuperadmin } from "./support/scope-test-session.mjs";

async function stubPlatform(page) {
  await page.route((url) => url.pathname === "/api/v1/platform/tenants", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { items: [{ tenant_id: "tenant-1", name: "Acme Workspace", status: "active" }], meta: { page: 1, limit: 100, total: 1 } } }),
  }));
  await page.route((url) => url.pathname === "/api/v1/platform/tenants/tenant-1/companies", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { items: [{ company_id: "company-1", name: "Acme Industries", status: "active" }], meta: { page: 1, limit: 100, total: 1 } } }),
  }));
}

test.describe("platform control-plane UX", () => {
  test("the platform console exposes workspace provisioning, not customer administration", async ({ page }) => {
    await stubPlatform(page);
    await loginAsPlatformSuperadmin(page);
    await expect(page.getByRole("heading", { name: "Customer provisioning" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Platform overview" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Settings$/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Access$/i })).toHaveCount(0);

    await page.getByRole("button", { name: "New workspace" }).click();
    await expect(page.getByLabel("Tenant name")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create workspace" })).toBeDisabled();
    await page.getByLabel("Tenant name").fill("A new workspace");
    await expect(page.getByRole("button", { name: "Create workspace" })).toBeEnabled();
  });

  test("customer routes cannot become a platform admin's workspace view", async ({ page }) => {
    await stubPlatform(page);
    await loginAsPlatformSuperadmin(page);
    for (const path of ["/id/settings/companies", "/id/settings/access", "/id/settings/company-context", "/id/settings/news-intake"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/id\/settings\/platform\/?$/, { timeout: 15_000 });
      await expect(page.getByRole("heading", { name: "Customer provisioning" })).toBeVisible();
    }
  });
});
