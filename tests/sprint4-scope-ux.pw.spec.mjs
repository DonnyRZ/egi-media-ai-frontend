import { test, expect } from "@playwright/test";
import { loginAsPlatformSuperadmin } from "./support/scope-test-session.mjs";

test.describe("platform owner-assignment handoff", () => {
  test("assign owner produces an explicit signup and scope next step", async ({ page }) => {
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
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { membership: { role: "tenant_owner", status: "invited" } }, meta: { request_id: "scope-test" } }) });
    });

    await loginAsPlatformSuperadmin(page);
    await page.locator(".platform-tenant-row").filter({ hasText: "Sprint4 Workspace" }).getByRole("button", { name: "Open workspace" }).click();
    await expect(page.getByText("Selected workspace", { exact: true })).toBeVisible();
    await page.getByLabel("Owner email").fill("owner@sprint4.test");
    await expect(page.getByLabel("Owner email")).toHaveValue("owner@sprint4.test");
    await page.getByLabel("Owner full name").fill("Sprint4 Owner");
    await expect(page.getByLabel("Owner full name")).toHaveValue("Sprint4 Owner");
    await page.getByRole("combobox", { name: "Owner company" }).click();
    await page.getByRole("option", { name: "Sprint4 Company", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Owner company" })).toContainText("Sprint4 Company");
    await page.getByRole("button", { name: /Assign owner/i }).click();

    const next = page.getByTestId("provisioning-owner-next-steps");
    await expect(next).toBeVisible();
    await expect(next).toContainText("Tenant owner assigned");
    await expect(next).toContainText("owner@sprint4.test");
    await expect(next).toContainText(/after signing up with this exact email/i);
    await expect(next.getByRole("link", { name: /Open signup page/i })).toBeVisible();
    await expect(page.getByText("Platform control plane")).toBeVisible();
  });
});
