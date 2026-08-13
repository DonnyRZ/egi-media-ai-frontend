import { test, expect } from "@playwright/test";
import { loginAsPlatformSuperadmin, PLATFORM_PERMISSIONS } from "./support/scope-test-session.mjs";

test.describe("Loop A/B platform_superadmin provisioning", () => {
  test("session permissions unlock provisioning UX", async ({ page }) => {
    test.setTimeout(90_000);
    let tenants = [{ tenant_id: "tenant-egiresources", name: "EGI Resources", status: "active" }];
    const companiesByTenant = { "tenant-egiresources": [{ company_id: "company-agat", name: "AGAT Laser Beam", status: "active" }] };
    const membershipsByTenant = { "tenant-egiresources": [] };

    await page.route((url) => url.pathname === "/api/v1/platform/tenants", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: tenants, meta: { page: 1, limit: 100, total: tenants.length } } }) });
        return;
      }
      const body = route.request().postDataJSON();
      const tenant = { tenant_id: "tenant-northstar", name: body.name, status: "pending" };
      tenants = [tenant, ...tenants];
      companiesByTenant[tenant.tenant_id] = [];
      membershipsByTenant[tenant.tenant_id] = [];
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: { tenant }, meta: { request_id: "platform-provisioning" } }) });
    });
    await page.route((url) => /\/tenants\/[^/]+\/companies$/.test(url.pathname), async (route) => {
      const tenantId = route.request().url().match(/tenants\/([^/]+)\/companies/)[1];
      if (route.request().method() === "GET") {
        const items = companiesByTenant[tenantId] || [];
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items, meta: { page: 1, limit: 100, total: items.length } } }) });
        return;
      }
      const body = route.request().postDataJSON();
    const company = { company_id: `company-${tenantId}-new`, name: body.name, status: "active" };
      companiesByTenant[tenantId] = [company, ...(companiesByTenant[tenantId] || [])];
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: { company }, meta: { request_id: "platform-provisioning" } }) });
    });
    await page.route((url) => /\/tenants\/[^/]+\/owner$/.test(url.pathname), async (route) => {
      const tenantId = route.request().url().match(/tenants\/([^/]+)\/owner/)[1];
      const body = route.request().postDataJSON();
      const membership = {
        membership_id: `membership-owner-${tenantId}`,
        user_id: `user:${body.email}`,
        role: "tenant_owner",
        status: "invited",
        company_id: body.company_id || null,
        email: body.email,
        full_name: body.full_name || null,
      };
      membershipsByTenant[tenantId] = [membership, ...(membershipsByTenant[tenantId] || [])];
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: { membership, reused: false }, meta: { request_id: "platform-provisioning" } }) });
    });
    await page.route((url) => /\/tenants\/[^/]+\/memberships$/.test(url.pathname), async (route) => {
      const tenantId = route.request().url().match(/tenants\/([^/]+)\/memberships/)[1];
      const items = membershipsByTenant[tenantId] || [];
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items, meta: { page: 1, limit: 100, total: items.length } } }) });
    });
    await loginAsPlatformSuperadmin(page);

    await page.goto("/id/settings/platform");
    await page.waitForLoadState("networkidle");

    // Give AuthGate time to apply session permissions after full navigation.
    await page.waitForTimeout(1500);

    const forbidden = page.getByRole("heading", { name: /platform administration only/i });
    const provisioningTitle = page.getByRole("heading", { name: /customer workspaces/i });

    // Loop A assert
    expect(PLATFORM_PERMISSIONS).toContain("platform.tenants.manage");
    await expect(forbidden).toHaveCount(0, { timeout: 15_000 });
    await expect(provisioningTitle).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("alert").filter({ hasText: /could not load tenants|tenants are unavailable/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "System health", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Audit log", exact: true })).toBeVisible();
    await expect(page).toHaveScreenshot("platform-provisioning-initial.png", { fullPage: true });

    await page.getByRole("button", { name: "New workspace" }).click();
    await expect(page.getByLabel("Tenant name")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create workspace" })).toBeDisabled();
    await expect(page).toHaveScreenshot("platform-provisioning-new-workspace-empty.png", { fullPage: true });
    await page.getByLabel("Tenant name").fill("Northstar Workspace");
    await page.getByRole("button", { name: "Create workspace" }).click();
    await expect(page).toHaveURL(/\/id\/settings\/platform$/, { timeout: 15_000 });
    await expect(page.getByRole("status").filter({ hasText: "Workspace created. Open Northstar Workspace when you're ready." })).toBeVisible();
    await expect(page.locator(".platform-tenant-row").filter({ hasText: /Northstar Workspace/i }).first()).toBeVisible();
    await page.locator(".platform-tenant-row").filter({ hasText: /Northstar Workspace/i }).first().getByRole("link", { name: "Open workspace" }).click();
    await expect(page.getByRole("heading", { name: "Northstar Workspace" })).toBeVisible();

    // Loop B: EGI Resources tenant + AGAT company
    await page.getByRole("link", { name: "← Workspace registry" }).click();
    const egiRow = page.locator(".platform-tenant-row").filter({ hasText: /EGI Resources/i }).first();
    await expect(egiRow).toBeVisible({ timeout: 15_000 });
    await egiRow.getByRole("link", { name: "Open workspace" }).click();
    await expect(page.getByText(/AGAT Laser Beam/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("alert").filter({ hasText: /could not load companies|companies are unavailable/i })).toHaveCount(0);
    await expect(page.getByLabel("Owner email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Assign owner" })).toBeDisabled();
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot("platform-provisioning-selected-workspace.png", { fullPage: true });

    await page.getByRole("button", { name: "+ Add company" }).click();
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

  test("registry failure does not masquerade as an endless loading state", async ({ page }) => {
    await page.route((url) => url.pathname === "/api/v1/platform/tenants", async (route) => {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Tenant registry is temporarily unavailable." } }) });
    });
    await loginAsPlatformSuperadmin(page);
    await page.goto("/id/settings/platform");
    await expect(page.getByText("Workspaces could not be loaded", { exact: true })).toBeVisible();
    await expect(page.getByText("Workspace registry unavailable", { exact: true })).toBeVisible();
    await expect(page.getByText("Loading workspace registry…", { exact: true })).toHaveCount(0);
  });
});
