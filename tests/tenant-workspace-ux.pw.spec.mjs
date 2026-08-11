import { test, expect } from "@playwright/test";

const OWNER_PERMISSIONS = [
  "dashboard.read", "issue.read", "issue.complete", "issue.save",
  "company_context.read", "company_context.draft", "company_context.review", "company_context.approve",
  "report.read", "report.create", "report.review.submit", "report.approve", "report.share", "report.rewrite",
  "alert.read", "alert.preference.manage", "company.language.manage",
  "tenant.users.manage", "tenant.companies.manage", "tenant.settings.manage", "company.users.manage",
  "audit.read", "news.intake.read", "news.intake.trigger", "news.intake.manage",
];

const COMPANY = { company_id: "company-a", tenant_id: "tenant-a", name: "Company A", status: "active" };
const COMPANIES = [COMPANY, { company_id: "company-b", tenant_id: "tenant-a", name: "Company B", status: "pending" }];

async function seedCustomer(page, role = "tenant_owner") {
  const session = {
    authenticated: true,
    accessToken: `tenant-${role}-token`,
    actor: { id: "user:owner@example.com", email: "owner@example.com", fullName: role === "tenant_admin" ? "Tenant Admin" : "Tenant Owner", role, actorType: "human" },
    permissions: OWNER_PERMISSIONS,
    tenantId: "tenant-a",
    activeCompanyId: "company-a",
    authorizedCompanies: COMPANIES,
  };
  await page.addInitScript((value) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("egi_media_ai_session", JSON.stringify(value));
  }, session);
  const sessionData = {
    actor: { id: session.actor.id, email: session.actor.email, type: "human", role, membership_id: "membership-owner" },
    tenant_id: "tenant-a", company_id: "company-a", role, permissions: OWNER_PERMISSIONS, authorized_companies: COMPANIES,
  };
  await page.route("**/api/v1/auth/session", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: sessionData, meta: { request_id: "tenant-ux" } }) }));
  await page.route("**/api/v1/auth/login", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { access_token: session.accessToken, token_type: "Bearer", ...sessionData }, meta: { request_id: "tenant-ux" } }) }));
  await page.route("**/api/v1/companies", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: COMPANIES }, meta: { request_id: "tenant-ux" } }) }));
  await page.route("**/api/v1/news-intake/status", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { intake_ready: true, management_identity: { status: "ready", ready: true, has_effective_context: true } }, meta: { request_id: "tenant-ux" } }) }));
  await page.route("**/api/v1/inbox/emails", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [] }, meta: { request_id: "tenant-ux" } }) }));
}

test.describe("tenant owner/admin workspace UX gate", () => {
  test("tenant owner can operate the company registry with clear lifecycle feedback", async ({ page }) => {
    let companies = structuredClone(COMPANIES);
    await seedCustomer(page, "tenant_owner");
    await page.route((url) => url.pathname === "/api/v1/tenant/companies", async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: companies }, meta: { request_id: "tenant-ux" } }) });
      }
      const body = route.request().postDataJSON();
      const created = { company_id: "company-c", tenant_id: "tenant-a", name: body.name, status: "active" };
      companies = [created, ...companies];
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: { company: created }, meta: { request_id: "tenant-ux" } }) });
    });
    await page.route((url) => url.pathname.startsWith("/api/v1/tenant/companies/") && url, async (route) => {
      if (route.request().method() !== "PATCH") return route.fallback();
      const companyId = new URL(route.request().url()).pathname.split("/").pop();
      const body = route.request().postDataJSON();
      const updated = { ...companies.find((item) => item.company_id === companyId), name: body.name, status: body.status };
      companies = companies.map((item) => item.company_id === companyId ? updated : item);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { company: updated }, meta: { request_id: "tenant-ux" } }) });
    });

    await page.goto("/id/settings/companies");
    await expect(page.getByRole("banner").getByRole("heading", { name: "Companies", exact: true })).toBeVisible();
    const companyRegistry = page.locator(".company-list-panel");
    await expect(companyRegistry.getByText("Company A")).toBeVisible();
    await expect(companyRegistry.getByText("Pending setup")).toBeVisible();
    await expect(page).toHaveScreenshot("tenant-companies-initial.png", { fullPage: true });

    await page.getByLabel("Company name").fill("Northstar Analytics");
    await page.getByRole("button", { name: "Create company" }).click();
    await expect(page.getByRole("status")).toContainText("Company created");
    await expect(page.getByText("Northstar Analytics")).toBeVisible();

    const companyRow = page.locator(".company-admin-row").filter({ hasText: "Company B" });
    await expect(companyRow.getByRole("button", { name: "Edit" })).toBeVisible();
    await companyRow.getByRole("button", { name: "Edit" }).click();
    await companyRow.getByLabel("Company name").fill("Company B Updated");
    await companyRow.getByRole("combobox", { name: "Status" }).click();
    await companyRow.getByRole("option", { name: "Suspended", exact: true }).click();
    await companyRow.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Company details updated");
    await expect(page.getByText("Suspended")).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveScreenshot("tenant-companies-after-edit.png");
  });

  test("tenant admin sees the same tenant controls but the UI stays scoped to the workspace", async ({ page }) => {
    let members = [
      { membership_id: "membership-analyst", user_id: "user:analyst@example.com", tenant_id: "tenant-a", company_id: "company-a", role: "analyst", status: "active", version: 1 },
      { membership_id: "membership-viewer", user_id: "user:viewer@example.com", tenant_id: "tenant-a", company_id: null, role: "viewer", status: "invited", version: 1 },
    ];
    const requests = [];
    await seedCustomer(page, "tenant_admin");
    await page.route("**/api/v1/tenant/companies", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: COMPANIES }, meta: { request_id: "tenant-ux" } }) }));
    await page.route((url) => url.pathname === "/api/v1/tenant/memberships", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: members, meta: { total: members.length } }, meta: { request_id: "tenant-ux" } }) });
      const body = route.request().postDataJSON();
      requests.push({ method: route.request().method(), body, idempotency: route.request().headers()["idempotency-key"] });
      const created = { membership_id: "membership-new", user_id: `user:${body.email}`, tenant_id: "tenant-a", company_id: body.company_id, role: body.role, status: "invited", version: 1 };
      members = [...members, created];
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: { membership: created, reused: false }, meta: { request_id: "tenant-ux" } }) });
    });
    await page.route((url) => url.pathname.startsWith("/api/v1/tenant/memberships/"), async (route) => {
      if (route.request().method() !== "PATCH") return route.fallback();
      const membershipId = new URL(route.request().url()).pathname.split("/").pop();
      const body = route.request().postDataJSON();
      const updated = { ...members.find((item) => item.membership_id === membershipId), role: body.role, company_id: body.company_id };
      members = members.map((item) => item.membership_id === membershipId ? updated : item);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { membership: updated }, meta: { request_id: "tenant-ux" } }) });
    });
    await page.route((url) => url.pathname.startsWith("/api/v1/tenant/memberships/"), async (route) => {
      if (route.request().method() !== "DELETE") return route.fallback();
      const membershipId = new URL(route.request().url()).pathname.split("/").pop();
      members = members.map((item) => item.membership_id === membershipId ? { ...item, status: "revoked", version: item.version + 1 } : item);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { revoked: true }, meta: { request_id: "tenant-ux" } }) });
    });

    await page.goto("/id/settings/access");
    await expect(page.getByRole("banner").getByRole("heading", { name: "Access", exact: true })).toBeVisible();
    await expect(page.getByText("analyst@example.com")).toBeVisible();
    const roleSelect = page.getByRole("combobox", { name: "Role" });
    await roleSelect.click();
    await expect(page.getByRole("option")).toHaveCount(7);
    const roleLabels = await page.getByRole("option").allTextContents();
    expect(roleLabels).toEqual(["Tenant admin", "Company admin", "Executive", "Executive viewer", "Analyst", "Reviewer", "Viewer"]);
    await page.keyboard.press("Escape");
    await expect(page).toHaveScreenshot("tenant-access-initial.png", { fullPage: true });

    await page.getByLabel("Work email").fill("newuser@example.com");
    await roleSelect.click();
    await page.getByRole("option", { name: "Executive", exact: true }).click();
    const companyAccessSelect = page.getByRole("combobox", { name: "Company access" });
    await companyAccessSelect.click();
    await page.getByRole("option", { name: "Company B", exact: true }).click();
    await page.getByRole("button", { name: "Invite member" }).click();
    await expect(page.getByRole("status")).toContainText("Invitation created");
    expect(requests[0].body).toMatchObject({ email: "newuser@example.com", role: "executive", company_id: "company-b" });
    expect(requests[0].idempotency.length).toBeGreaterThanOrEqual(16);
    await expect(page.getByText("newuser@example.com")).toBeVisible();

    const analystRow = page.locator(".access-member-item").filter({ hasText: "analyst@example.com" });
    await analystRow.getByRole("button", { name: "Edit" }).click();
    await analystRow.getByRole("combobox", { name: "Edit role for analyst@example.com" }).click();
    await analystRow.getByRole("option", { name: "Reviewer", exact: true }).click();
    await analystRow.getByRole("combobox", { name: "Edit company access for analyst@example.com" }).click();
    await analystRow.getByRole("option", { name: "Company B", exact: true }).click();
    await analystRow.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Access updated");
    await expect(page.getByText("Reviewer · Company B")).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveScreenshot("tenant-access-after-edit.png");

    const viewerRow = page.locator(".access-member-item").filter({ hasText: "viewer@example.com" });
    await viewerRow.getByRole("button", { name: "Revoke" }).click();
    await expect(page.getByRole("alertdialog", { name: "Revoke access?" })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveScreenshot("tenant-access-revoke-confirmation.png");
    await page.getByRole("alertdialog", { name: "Revoke access?" }).getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("alertdialog", { name: "Revoke access?" })).toHaveCount(0);
  });

  test("context version registry puts delete and revision actions in the version list", async ({ page }) => {
    let versions = [
      { id: "context-v2", version: 2, status: "effective", company_id: "company-a", fields: { company_name: "Company A", industry: "Technology" }, updated_at: "2026-08-03T08:00:00Z", management_identity: { status: "ready", lens_summary: "Leadership lens for Company A." } },
      { id: "context-v1", version: 1, status: "archived", company_id: "company-a", fields: { company_name: "Company A", industry: "Technology" }, updated_at: "2026-07-01T08:00:00Z", management_identity: { status: "failed", lens_summary: null } },
    ];
    await seedCustomer(page, "tenant_owner");
    await page.route((url) => url.pathname === "/api/v1/companies/company-a/context/versions", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: versions, meta: { total: versions.length, page: 1, limit: 20 } }, meta: { request_id: "tenant-ux" } }) }));
    await page.route("**/api/v1/companies/company-a/context", async (route) => {
      if (route.request().method() !== "DELETE") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { ...versions[0], management_identity: { status: "ready", lens_summary: "Leadership lens for Company A." } }, meta: { request_id: "tenant-ux" } }) });
      }
      versions = versions.filter((item) => item.status !== "effective");
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { cleared: true, archived_version: 2, company_id: "company-a" }, meta: { request_id: "tenant-ux" } }) });
    });
    await page.route("**/api/v1/news-intake/status", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { intake_ready: false, management_identity: { status: "missing", has_effective_context: false } }, meta: { request_id: "tenant-ux" } }) }));

    await page.goto("/id/settings/company-context/versions");
    await expect(page.getByRole("heading", { name: "Context history" })).toBeVisible();
    await expect(page.getByText("v2")).toBeVisible();
    await expect(page.getByText("Effective")).toBeVisible();
    await expect(page.getByRole("link", { name: /Create revision/i })).toHaveAttribute("href", "/id/settings/company-context/draft");
    await expect(page).toHaveScreenshot("tenant-context-versions-initial.png", { fullPage: true });

    await page.getByRole("button", { name: "View" }).click();
    await expect(page.getByRole("dialog", { name: "Version v1" })).toBeVisible();
    await expect(page.getByText("Leadership lens for Company A.")).toHaveCount(0);
    await expect(page).toHaveScreenshot("tenant-context-archived-preview.png", { fullPage: true });
    await page.getByRole("dialog", { name: "Version v1" }).getByRole("button", { name: "Close context version preview" }).click();
    await expect(page.getByRole("dialog", { name: "Version v1" })).toHaveCount(0);

    await page.getByRole("button", { name: "Delete context version 2" }).click();
    await expect(page.getByRole("alertdialog", { name: "Delete version 2?" })).toBeVisible();
    await expect(page).toHaveScreenshot("tenant-context-delete-confirmation.png", { fullPage: true });
    await page.getByRole("alertdialog", { name: "Delete version 2?" }).getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("status")).toContainText("Context v2 deleted");
    await expect(page.getByText("No context yet")).toHaveCount(0);
  });

  test("tenant owner can review and filter workspace audit events", async ({ page }) => {
    await seedCustomer(page, "tenant_owner");
    await page.route((url) => url.pathname === "/api/v1/tenant/audit-events", async (route) => {
      const requestUrl = new URL(route.request().url());
      const outcome = requestUrl.searchParams.get("outcome");
      const items = outcome === "denied" ? [] : [{
        event_id: "audit-tenant-1",
        actor_id: "user:owner@example.com",
        actor_type: "human",
        tenant_id: "tenant-a",
        company_id: null,
        action: "tenant.members.manage",
        outcome: "allowed",
        request_id: "request-tenant-1",
        created_at: "2026-08-03T08:00:00Z",
      }];
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items, meta: { limit: 100, total: items.length } }, meta: { request_id: "tenant-ux" } }) });
    });

    await page.goto("/id/settings/audit-log");
    await expect(page.getByRole("main").getByLabel("Audit filters")).toBeVisible();
    await expect(page.getByRole("region", { name: "Tenant audit events" })).toBeVisible();
    await expect(page.getByText("Tenant.Members.Manage")).toBeVisible();
    await expect(page.getByRole("region", { name: "Tenant audit events" }).getByText("Allowed")).toBeVisible();
    await expect(page).toHaveScreenshot("tenant-audit-log-initial.png", { fullPage: true });

    await page.getByRole("combobox", { name: "Outcome" }).click();
    await page.getByRole("option", { name: "Denied", exact: true }).click();
    await expect(page.getByRole("heading", { name: "No audit events" })).toBeVisible();
    await expect(page.getByText("Access decisions will appear here as this workspace is used.")).toBeVisible();
    await expect(page).toHaveScreenshot("tenant-audit-log-empty.png", { fullPage: true });
  });

  test("tenant owner can configure alert preferences with backend confirmation", async ({ page }) => {
    let preference = {
      recipient_id: "recipient-owner",
      direct_high_enabled: false,
      daily_digest_enabled: false,
      timezone: "Asia/Jakarta",
      quiet_hours: null,
    };
    await seedCustomer(page, "tenant_owner");
    await page.route("**/api/v1/companies/company-a/alert-preference", async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: preference, meta: { request_id: "tenant-ux" } }) });
      }
      const body = route.request().postDataJSON();
      preference = { ...preference, ...body };
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: preference, meta: { request_id: "tenant-ux" } }) });
    });

    await page.goto("/id/settings/alert-preferences");
    await expect(page.getByRole("heading", { name: "Alert preferences", exact: true })).toBeVisible();
    await expect(page.getByRole("switch", { name: "High alert" })).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("button", { name: "Save preferences" })).toBeEnabled();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveScreenshot("tenant-alert-preferences-initial.png");

    await page.getByRole("switch", { name: "High alert" }).click();
    await page.getByRole("switch", { name: "Quiet hours" }).click();
    await page.getByLabel("Start").fill("21:00");
    await page.getByLabel("End", { exact: true }).fill("06:00");
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page.getByRole("status")).toContainText("Preference confirmed by backend");
    expect(preference).toMatchObject({ direct_high_enabled: true, quiet_hours: { start: "21:00", end: "06:00" } });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveScreenshot("tenant-alert-preferences-saved.png");
  });

  test("tenant owner can change the language for newly generated output", async ({ page }) => {
    let language = "id";
    await seedCustomer(page, "tenant_owner");
    await page.route("**/api/v1/companies/company-a/language-preference", async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { language }, meta: { request_id: "tenant-ux" } }) });
      }
      language = route.request().postDataJSON().language;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { language }, meta: { request_id: "tenant-ux" } }) });
    });

    await page.goto("/id/settings/display-language");
    await expect(page.getByRole("heading", { name: "Display language", exact: true })).toBeVisible();
    await expect(page.getByTestId("display-language-select")).toContainText("Bahasa Indonesia");
    await expect(page.getByTestId("display-language-save")).toBeDisabled();
    await expect(page).toHaveScreenshot("tenant-display-language-initial.png");

    await page.getByTestId("display-language-select").click();
    await page.getByRole("option", { name: "English", exact: true }).click();
    await expect(page.getByTestId("display-language-save")).toBeEnabled();
    await page.getByTestId("display-language-save").click();
    await expect(page.getByRole("status")).toContainText("Display language preference saved");
    expect(language).toBe("en");
    await expect(page).toHaveScreenshot("tenant-display-language-saved.png");
  });
});
