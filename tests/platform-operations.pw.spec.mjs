import { test, expect } from "@playwright/test";
import { loginAsPlatformSuperadmin } from "./support/scope-test-session.mjs";

const health = {
  service: "egi-media-ai-backend",
  status: "ready",
  environment: "development",
  checked_at: "2026-08-03T08:00:00.000Z",
  checks: { environment: "ok", persistence: "memory", ai_provider: "configured", automation: "configured", metrics: "ok" },
  metrics: { counters: [{ name: "http_requests_total", value: 12 }], histograms: [] },
};

test.describe("platform operations surfaces", () => {
  test("system health shows live checks and refresh", async ({ page }) => {
    await page.route("**/api/v1/platform/health", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: health, meta: { request_id: "ops-test" } }) }));
    await loginAsPlatformSuperadmin(page);
    await page.goto("/id/settings/platform/health");
    await expect(page.getByRole("heading", { name: "System health" })).toBeVisible();
    await expect(page.getByText("Operational")).toBeVisible();
    await expect(page.getByText("Ai Provider")).toBeVisible();
    await expect(page.getByText("12")).toBeVisible();
    await expect(page).toHaveScreenshot("platform-health-desktop.png", { fullPage: true });
  });

  test("audit log presents filterable accountability records", async ({ page }) => {
    const audit = [{ event_id: "event-1", actor_id: "scope-platform-admin", actor_type: "human", tenant_id: null, company_id: null, action: "platform.tenants.manage", outcome: "allowed", request_id: "request-123456", created_at: "2026-08-03T08:00:00.000Z" }];
    await page.route((url) => url.pathname === "/api/v1/platform/audit-events", async (route) => {
      const outcome = new URL(route.request().url()).searchParams.get("outcome");
      const items = outcome === "denied" ? [] : audit;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items, meta: { limit: 100, total: items.length } }, meta: { request_id: "ops-test" } }) });
    });
    await loginAsPlatformSuperadmin(page);
    await page.goto("/id/settings/platform/audit-log");
    await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Platform.Tenants.Manage" })).toBeVisible();
    await expect(page.getByLabel("Platform audit events").getByText("Allowed")).toBeVisible();
    await page.getByRole("combobox", { name: "Outcome" }).click();
    await page.getByRole("option", { name: "Denied", exact: true }).click();
    await expect(page.getByRole("heading", { name: "No audit events" })).toBeVisible();
    await expect(page).toHaveScreenshot("platform-audit-log-desktop.png", { fullPage: true });
  });
});
