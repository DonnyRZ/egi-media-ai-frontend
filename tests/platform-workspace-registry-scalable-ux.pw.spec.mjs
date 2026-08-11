import { test, expect } from "@playwright/test";
import { loginAsPlatformSuperadmin } from "./support/scope-test-session.mjs";

test.describe("scalable platform workspace registry UX", () => {
  test("pages through 100 workspaces and suspends every matching active workspace in one operation", async ({ page }) => {
    const tenants = Array.from({ length: 100 }, (_, index) => ({
      tenant_id: `tenant-${String(index + 1).padStart(3, "0")}`,
      name: `Workspace ${String(index + 1).padStart(3, "0")}`,
      status: "active",
      updated_at: "2026-08-03T00:00:00.000Z",
    }));
    let bulkBody = null;

    await page.route((url) => url.pathname === "/api/v1/platform/tenants", async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      const params = new URL(route.request().url()).searchParams;
      const requestedPage = Number(params.get("page") || "1");
      const limit = Number(params.get("limit") || "50");
      const status = params.get("status");
      const query = (params.get("q") || "").trim().toLowerCase();
      const searchScoped = tenants.filter((tenant) => !query || `${tenant.name} ${tenant.tenant_id}`.toLowerCase().includes(query));
      const items = searchScoped.filter((tenant) => !status || tenant.status === status);
      const counts = {
        all: searchScoped.length,
        active: searchScoped.filter((tenant) => tenant.status === "active").length,
        pending: searchScoped.filter((tenant) => tenant.status === "pending").length,
        suspended: searchScoped.filter((tenant) => tenant.status === "suspended").length,
        archived: searchScoped.filter((tenant) => tenant.status === "archived").length,
      };
      const start = (requestedPage - 1) * limit;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { items: items.slice(start, start + limit), meta: { page: requestedPage, limit, total: items.length, counts } } }),
      });
    });

    await page.route((url) => url.pathname === "/api/v1/platform/tenants/bulk-lifecycle", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      bulkBody = route.request().postDataJSON();
      const selected = Array.isArray(bulkBody.tenant_ids)
        ? tenants.filter((tenant) => bulkBody.tenant_ids.includes(tenant.tenant_id))
        : tenants.filter((tenant) => (!bulkBody.filter?.status || tenant.status === bulkBody.filter.status) && (!bulkBody.filter?.q || `${tenant.name} ${tenant.tenant_id}`.toLowerCase().includes(String(bulkBody.filter.q).toLowerCase())));
      for (const tenant of selected) tenant.status = bulkBody.status;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { tenants: selected, updated_count: selected.length, lifecycle_changed: true } }) });
    });

    await loginAsPlatformSuperadmin(page);
    await page.goto("/id/settings/platform");
    await expect(page.getByRole("heading", { name: "Customer workspaces" })).toBeVisible();
    await expect(page.getByText("Page 1 of 5", { exact: true })).toBeVisible();
    await expect(page.getByText("100 matching workspaces", { exact: true })).toBeVisible();
    await expect(page.locator(".platform-tenant-row")).toHaveCount(20);

    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText("Page 2 of 5", { exact: true })).toBeVisible();
    await expect(page.getByText("Workspace 021", { exact: true })).toBeVisible();

    const search = page.getByRole("searchbox", { name: "Search workspaces", exact: true });
    await search.fill("Workspace 100");
    await expect(page.getByText("1 matching workspace", { exact: true })).toBeVisible();
    await expect(page.getByText("Page 1 of 1", { exact: true })).toBeVisible();
    await expect(page.getByText("Workspace 100", { exact: true })).toBeVisible();

    await search.fill("");
    await expect(page.getByText("100 matching workspaces", { exact: true })).toBeVisible();
    const statusSelect = page.getByRole("combobox", { name: "Filter workspace status" });
    await statusSelect.click();
    await page.getByRole("option", { name: "Active 100", exact: true }).click();
    await expect(page.locator(".platform-tenant-row")).toHaveCount(20);

    await page.getByRole("button", { name: "Select workspaces" }).click();
    await page.getByRole("checkbox", { name: "Select active workspaces on this page", exact: true }).click();
    await expect(page.getByText("20 active workspaces selected", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Select all 100 matching", exact: true }).click();
    await expect(page.getByText("100 active workspaces selected", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Suspend selected", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Suspend 100 workspaces?" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("The operation is applied atomically.");
    await dialog.getByRole("textbox").fill("Subscription ended for all evaluation workspaces");
    await dialog.getByRole("button", { name: "Suspend 100 workspaces", exact: true }).click();

    await expect(page.getByRole("status").filter({ hasText: "100 workspaces are now suspended" })).toBeVisible();
    expect(bulkBody).toMatchObject({ status: "suspended", filter: { status: "active" }, reason: "Subscription ended for all evaluation workspaces" });
    await statusSelect.click();
    await page.getByRole("option", { name: "Suspended 100", exact: true }).click();
    await expect(page.locator(".platform-tenant-row")).toHaveCount(20);

    await page.getByRole("button", { name: "Select workspaces" }).click();
    await page.getByRole("checkbox", { name: "Select suspended workspaces on this page", exact: true }).click();
    await expect(page.getByText("20 suspended workspaces selected", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Select all 100 matching", exact: true }).click();
    await expect(page.getByText("100 suspended workspaces selected", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Archive selected", exact: true }).click();
    const archiveDialog = page.getByRole("dialog", { name: "Archive 100 workspaces?" });
    await expect(archiveDialog).toBeVisible();
    await expect(archiveDialog).toContainText("These workspaces will leave daily operations.");
    await archiveDialog.getByRole("textbox").fill("Customer workspaces archived after subscription closure");
    await archiveDialog.getByRole("button", { name: "Archive 100 workspaces", exact: true }).click();

    await expect(page.getByRole("status").filter({ hasText: "100 workspaces are now archived" })).toBeVisible();
    expect(bulkBody).toMatchObject({ status: "archived", filter: { status: "suspended" }, reason: "Customer workspaces archived after subscription closure" });
    await statusSelect.click();
    await page.getByRole("option", { name: "Archived 100", exact: true }).click();
    await expect(page.locator(".platform-tenant-row")).toHaveCount(20);
  });
});
