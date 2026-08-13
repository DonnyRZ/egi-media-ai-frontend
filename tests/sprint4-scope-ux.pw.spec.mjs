import { test, expect } from "@playwright/test";
import { loginAsPlatformSuperadmin } from "./support/scope-test-session.mjs";

test.describe("platform owner-assignment handoff", () => {
  test("create owner produces a ready-to-sign-in next step", async ({ page }) => {
    await page.route((url) => url.pathname === "/api/v1/platform/tenants", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { items: [{ tenant_id: "tenant-4", name: "Sprint4 Workspace", status: "active" }], meta: { page: 1, limit: 100, total: 1 } } }),
    }));
    await page.route((url) => url.pathname === "/api/v1/platform/tenants/tenant-4/companies", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { items: [{ company_id: "company-4", name: "Sprint4 Company", status: "active" }], meta: { page: 1, limit: 100, total: 1 } } }),
    }));
    await page.route((url) => url.pathname === "/api/v1/platform/tenants/tenant-4/owner", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { membership: { role: "tenant_owner", status: "active" } }, meta: { request_id: "scope-test" } }) });
    });
    await page.route((url) => url.pathname === "/api/v1/platform/tenants/tenant-4/memberships", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [], meta: { page: 1, limit: 100, total: 0 } } }) }));

    await loginAsPlatformSuperadmin(page);
    await page.goto("/id/settings/platform");
    await page.locator(".platform-tenant-row").filter({ hasText: "Sprint4 Workspace" }).getByRole("link", { name: "Open workspace" }).click();
    await expect(page).toHaveURL(/\/id\/settings\/platform\/tenants\/tenant-4$/);
    await expect(page.getByRole("heading", { name: "Sprint4 Workspace" })).toBeVisible();
    await page.getByLabel("Owner email").fill("owner@sprint4.test");
    await expect(page.getByLabel("Owner email")).toHaveValue("owner@sprint4.test");
    await page.getByLabel("Owner full name").fill("Sprint4 Owner");
    await expect(page.getByLabel("Owner full name")).toHaveValue("Sprint4 Owner");
    await page.getByLabel("Password", { exact: true }).fill("OwnerPass123!");
    await page.getByLabel("Confirm password").fill("OwnerPass123!");
    await page.getByRole("combobox", { name: "Owner company" }).click();
    await page.getByRole("option", { name: "Sprint4 Company", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Owner company" })).toContainText("Sprint4 Company");
    await page.getByRole("button", { name: /Create owner/i }).click();

    const next = page.getByTestId("provisioning-owner-next-steps");
    await expect(next).toBeVisible();
    await expect(next).toContainText("Owner account is ready");
    await expect(next).toContainText("owner@sprint4.test");
    await expect(next).toContainText(/can sign in now/i);
    await expect(next.getByRole("link", { name: /Open sign in/i })).toBeVisible();
    await expect(page.getByText("Platform control plane")).toBeVisible();
  });
});
