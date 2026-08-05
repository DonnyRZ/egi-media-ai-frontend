import { test, expect } from "@playwright/test";

const CUSTOMER_PERMISSIONS = ["dashboard.read", "issue.read", "issue.save", "company_context.read", "report.read", "alert.read"];
const COMPANY = { company_id: "company-a", tenant_id: "tenant-a", name: "Company A", role: "executive_viewer" };

async function loginAsCustomer(page) {
  const session = {
    authenticated: true,
    accessToken: "rbac-customer-token",
    actor: { id: "user:customer@example.test", email: "customer@example.test", fullName: "Customer User", role: "executive_viewer", actorType: "human" },
    permissions: CUSTOMER_PERMISSIONS,
    tenantId: "tenant-a",
    activeCompanyId: "company-a",
    authorizedCompanies: [COMPANY],
  };
  const sessionData = {
    actor: { id: session.actor.id, email: session.actor.email, type: "human", role: session.actor.role, membership_id: "membership-customer" },
    tenant_id: session.tenantId,
    company_id: session.activeCompanyId,
    role: session.actor.role,
    permissions: CUSTOMER_PERMISSIONS,
    authorized_companies: [COMPANY],
  };

  await page.addInitScript((value) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("egi_media_ai_session", JSON.stringify(value));
  }, session);
  await page.route("**/api/v1/auth/session", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: sessionData, meta: { request_id: "rbac-boundaries" } }) }));
  await page.route("**/api/v1/companies", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [COMPANY] }, meta: { request_id: "rbac-boundaries" } }) }));
  await page.goto("/id");
}

test.describe("direct route permission boundaries", () => {
  test("customer roles cannot read platform, tenant company, or access registries without permission", async ({ page }) => {
    const blockedRequests = [];
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (["/api/v1/platform/tenants", "/api/v1/platform/health", "/api/v1/platform/audit-events", "/api/v1/tenant/companies", "/api/v1/tenant/memberships"].includes(path)) blockedRequests.push(path);
    });
    await loginAsCustomer(page);

    await page.goto("/id/settings/platform");
    await expect(page.getByRole("heading", { name: "Platform administration only" })).toBeVisible();
    await page.goto("/id/settings/platform/health");
    await expect(page.getByRole("heading", { name: "System health restricted" })).toBeVisible();
    await page.goto("/id/settings/platform/audit-log");
    await expect(page.getByRole("heading", { name: "Platform audit restricted" })).toBeVisible();
    await page.goto("/id/settings/companies");
    await expect(page.getByRole("heading", { name: "Company administration restricted" })).toBeVisible();
    await page.goto("/id/settings/access");
    await expect(page.getByRole("heading", { name: "Access restricted" })).toBeVisible();

    expect(blockedRequests).toEqual([]);
  });
});
