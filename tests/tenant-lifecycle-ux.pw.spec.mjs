import { test, expect } from "@playwright/test";
import { loginAsPlatformSuperadmin } from "./support/scope-test-session.mjs";

test.describe("platform workspace lifecycle UX", () => {
  test("superadmin can pause, archive, and restore a workspace without misleading provisioning controls", async ({ page }) => {
    let tenant = { tenant_id: "tenant-lifecycle", name: "Lifecycle Review Workspace", status: "active", updated_at: "2026-08-03T00:00:00Z" };

    await page.route((url) => url.pathname === "/api/v1/platform/tenants", async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      const counts = { all: 1, active: tenant.status === "active" ? 1 : 0, pending: tenant.status === "pending" ? 1 : 0, suspended: tenant.status === "suspended" ? 1 : 0, archived: tenant.status === "archived" ? 1 : 0 };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [tenant], meta: { page: 1, limit: 20, total: 1, counts } } }) });
    });
    await page.route((url) => url.pathname === "/api/v1/platform/tenants/tenant-lifecycle", async (route) => {
      if (route.request().method() !== "PATCH") return route.fallback();
      const body = route.request().postDataJSON();
      const previousStatus = tenant.status;
      tenant = { ...tenant, status: body.status, updated_at: "2026-08-03T00:01:00Z" };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { tenant, previous_status: previousStatus, lifecycle_changed: previousStatus !== tenant.status } }) });
    });
    await page.route((url) => url.pathname === "/api/v1/platform/tenants/tenant-lifecycle/companies", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [], meta: { page: 1, limit: 100, total: 0 } } }) }));
    await page.route((url) => url.pathname === "/api/v1/platform/tenants/tenant-lifecycle/memberships", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [], meta: { page: 1, limit: 100, total: 0 } } }) }));

    await loginAsPlatformSuperadmin(page);
    await page.goto("/id/settings/platform");
    await expect(page.getByRole("heading", { name: "Workspace registry" })).toBeVisible();
    await page.getByRole("button", { name: "Open workspace" }).click();
    await expect(page.getByRole("button", { name: "Suspend workspace" })).toBeVisible();

    await page.getByRole("button", { name: "Suspend workspace" }).click();
    const suspendDialog = page.getByRole("dialog", { name: "Suspend this workspace?" });
    await expect(suspendDialog).toBeVisible();
    await expect(suspendDialog.getByText("Required", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(suspendDialog).toHaveCount(0);
    await page.getByRole("button", { name: "Suspend workspace" }).click();
    await expect(suspendDialog).toBeVisible();
    await expect(page).toHaveScreenshot("tenant-lifecycle-suspend-dialog.png", { fullPage: false });
    await suspendDialog.getByRole("button", { name: "Suspend workspace" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Add a reason" })).toBeVisible();

    await suspendDialog.getByRole("textbox", { name: /Reason/ }).fill("Subscription ended for lifecycle review");
    await suspendDialog.getByRole("button", { name: "Suspend workspace" }).click();
    await expect(page.getByText("Provisioning paused", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Company name")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Archive workspace" })).toBeVisible();
    const statusSelect = page.getByRole("combobox", { name: "Filter workspace status" });
    await statusSelect.click();
    await page.getByRole("option", { name: /Suspended 1/ }).click();
    await expect(page.getByText("Suspended", { exact: true }).first()).toBeVisible();

    await statusSelect.click();
    await page.getByRole("option", { name: /All 1/ }).click();
    await page.getByRole("button", { name: "Archive workspace" }).click();
    const archiveDialog = page.getByRole("dialog", { name: "Archive this workspace?" });
    await archiveDialog.getByRole("textbox", { name: /Reason/ }).fill("Customer did not renew the service");
    await archiveDialog.getByRole("button", { name: "Archive workspace" }).click();
    await expect(page.getByRole("button", { name: "Restore workspace" })).toBeVisible();
    await expect(page.getByLabel("Company name")).toHaveCount(0);

    await page.getByRole("button", { name: "Restore workspace" }).click();
    const restoreDialog = page.getByRole("dialog", { name: "Restore this workspace?" });
    await expect(restoreDialog.getByText("Verify its company and owner setup before handoff.")).toBeVisible();
    await restoreDialog.getByRole("button", { name: "Restore workspace" }).click();
    await expect(page.getByRole("button", { name: "Suspend workspace" })).toBeVisible();
    await expect(page.getByLabel("Company name")).toBeVisible();
  });
});
