import { test, expect } from "@playwright/test";
import { loginAsPlatformSuperadmin } from "./support/scope-test-session.mjs";

async function stubTenants(page, items = []) {
  await page.route((url) => url.pathname === "/api/v1/platform/tenants", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { items, meta: { page: 1, limit: 100, total: items.length } } }),
  }));
}

test.describe("platform navigation", () => {
  test("platform overview is the stable destination for an unscoped superadmin", async ({ page }) => {
    await stubTenants(page, []);
    await loginAsPlatformSuperadmin(page);
    await expect(page.getByRole("heading", { name: "Platform overview" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Customer provisioning" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Platform overview" })).toHaveAttribute("href", "/id/settings/platform");
  });

  test("tenant registry state is truthful when the control plane has no workspaces", async ({ page }) => {
    await stubTenants(page, []);
    await loginAsPlatformSuperadmin(page);
    await expect(page.getByText("Create the first workspace to begin provisioning a company and its owner.")).toBeVisible();
    await expect(page.getByText("No customer workspaces have been created yet.")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "New workspace" })).toBeVisible();
  });
});
