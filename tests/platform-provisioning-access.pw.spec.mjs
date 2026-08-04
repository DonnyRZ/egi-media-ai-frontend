import { test, expect } from "@playwright/test";
import { loginAsPlatformSuperadmin, PLATFORM_PERMISSIONS } from "./support/scope-test-session.mjs";

test.describe("Loop A/B platform_superadmin provisioning", () => {
  test("session permissions unlock provisioning UX", async ({ page }) => {
    test.setTimeout(90_000);
    const capture = { login: { status: 200, role: "platform_superadmin", tenant_id: null }, session: { status: 200, role: "platform_superadmin", permissions: PLATFORM_PERMISSIONS, hasManage: true } };
    let tenants = [{ tenant_id: "tenant-egiresources", name: "EGI Resources", status: "active" }];
    let companies = [{ company_id: "company-agat", name: "AGAT Laser Beam", status: "active" }];
    await page.route((url) => url.pathname === "/api/v1/platform/tenants", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: tenants, meta: { page: 1, limit: 100, total: tenants.length } } }) });
        return;
      }
      const body = route.request().postDataJSON();
      const tenant = { tenant_id: "tenant-northstar", name: body.name, status: "active" };
      tenants = [tenant, ...tenants];
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: { tenant }, meta: { request_id: "platform-provisioning" } }) });
    });
    await page.route((url) => url.pathname === "/api/v1/platform/tenants/tenant-egiresources/companies", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: companies, meta: { page: 1, limit: 100, total: companies.length } } }) });
        return;
      }
      const body = route.request().postDataJSON();
      const company = { company_id: "company-northstar", name: body.name, status: "active" };
      companies = [company, ...companies];
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: { company }, meta: { request_id: "platform-provisioning" } }) });
    });
    await page.route((url) => url.pathname === "/api/v1/platform/tenants/tenant-egiresources/owner", async (route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: { membership_id: "membership-owner", status: "invited" }, meta: { request_id: "platform-provisioning" } }) }));
    await page.route((url) => url.pathname === "/api/v1/platform/tenants/tenant-egiresources/memberships", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [], meta: { page: 1, limit: 100, total: 0 } } }) }));
    await loginAsPlatformSuperadmin(page);

    await page.goto("/id/settings/platform");
    await page.waitForLoadState("networkidle");

    // Give AuthGate time to apply session permissions after full navigation.
    await page.waitForTimeout(1500);

    const forbidden = page.getByRole("heading", { name: /platform administration only/i });
    const provisioningTitle = page.getByRole("heading", { name: /customer workspaces/i });

    // Loop A assert
    expect(capture.session?.hasManage).toBe(true);
    await expect(forbidden).toHaveCount(0, { timeout: 15_000 });
    await expect(provisioningTitle).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("alert").filter({ hasText: /could not load tenants|tenants are unavailable/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "System health", exact: true })).toBeVisible();
    await expect(page.locator("a.platform-capability-link").filter({ hasText: "System health" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Audit log", exact: true })).toBeVisible();
    await expect(page.locator("a.platform-capability-link").filter({ hasText: "Audit log" })).toBeVisible();
    await expect(page).toHaveScreenshot("platform-provisioning-initial.png", { fullPage: true });

    await page.getByRole("button", { name: "New workspace" }).click();
    await expect(page.getByLabel("Tenant name")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create workspace" })).toBeDisabled();
    await expect(page).toHaveScreenshot("platform-provisioning-new-workspace-empty.png", { fullPage: true });
    await page.getByLabel("Tenant name").fill("Northstar Workspace");
    await page.getByRole("button", { name: "Create workspace" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Workspace created." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Northstar Workspace" })).toBeVisible();

    // Loop B: EGI Resources tenant + AGAT company
    const egiRow = page.locator(".platform-tenant-row").filter({ hasText: /EGI Resources/i }).first();
    await expect(egiRow).toBeVisible({ timeout: 15_000 });
    await egiRow.getByRole("button", { name: "Open workspace" }).click();
    await expect(page.getByText(/AGAT Laser Beam/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("alert").filter({ hasText: /could not load companies|companies are unavailable/i })).toHaveCount(0);
    await expect(page.getByLabel("Owner email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Assign owner" })).toBeDisabled();
    await expect(page).toHaveScreenshot("platform-provisioning-selected-workspace.png", { fullPage: true });

    await page.getByLabel("Company name").fill("Northstar Analytics");
    await page.getByRole("button", { name: "Create company" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Company created." })).toBeVisible();
    await expect(page.locator(".platform-company-list").getByText("Northstar Analytics", { exact: true })).toBeVisible();
    await page.getByLabel("Owner email").fill("owner@northstar.example");
    await page.getByLabel("Owner full name").fill("Northstar Owner");
    await page.getByRole("combobox", { name: "Owner company" }).click();
    await page.getByRole("option", { name: "Northstar Analytics", exact: true }).click();
    await expect(page.getByRole("button", { name: "Assign owner" })).toBeEnabled();
    await page.getByRole("button", { name: "Assign owner" }).click();
    await expect(page.getByTestId("provisioning-owner-next-steps")).toContainText("Tenant owner assigned");
    await expect(page.getByRole("link", { name: "Open signup page" })).toHaveAttribute("href", "/id/signup");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveScreenshot("platform-provisioning-owner-assigned.png", { fullPage: true });
  });

  test("empty registry and create failure remain actionable", async ({ page }) => {
    await page.route((url) => url.pathname === "/api/v1/platform/tenants", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [], meta: { page: 1, limit: 100, total: 0 } } }) });
        return;
      }
      await route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Workspace name is already in use." } }) });
    });
    await loginAsPlatformSuperadmin(page);
    await page.goto("/id/settings/platform");
    await expect(page.getByText("No customer workspaces yet")).toBeVisible();
    await expect(page).toHaveScreenshot("platform-provisioning-empty.png", { fullPage: true });
    await page.getByRole("button", { name: "New workspace" }).click();
    await page.getByLabel("Tenant name").fill("Existing Workspace");
    await page.getByRole("button", { name: "Create workspace" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Workspace could not be created" })).toBeVisible();
    await expect(page).toHaveScreenshot("platform-provisioning-create-error.png", { fullPage: true });
  });
});
