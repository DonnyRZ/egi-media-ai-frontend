import { test, expect } from "@playwright/test";

const COMPANY_ADMIN_PERMISSIONS = [
  "dashboard.read", "issue.read", "issue.complete", "issue.save",
  "company_context.read", "company_context.draft", "company_context.review", "company_context.approve",
  "report.read", "report.create", "report.review.submit", "report.approve", "report.share", "report.rewrite",
  "alert.read", "alert.preference.manage", "company.language.manage", "company.users.manage",
  "news.intake.read", "news.intake.trigger",
];

const COMPANY = { company_id: "company-a", tenant_id: "tenant-a", name: "Company A", status: "active" };

async function seedCompanyAdmin(page) {
  const session = {
    authenticated: true,
    accessToken: "company-admin-token",
    actor: { id: "user:company-admin@example.com", email: "company-admin@example.com", fullName: "Company Admin", role: "company_admin", actorType: "human" },
    permissions: COMPANY_ADMIN_PERMISSIONS,
    tenantId: "tenant-a",
    activeCompanyId: "company-a",
    authorizedCompanies: [COMPANY],
  };
  await page.addInitScript((value) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("egi_media_ai_session", JSON.stringify(value));
  }, session);
  const sessionData = {
    actor: { id: session.actor.id, email: session.actor.email, type: "human", role: "company_admin", membership_id: "membership-company-admin" },
    tenant_id: "tenant-a", company_id: "company-a", role: "company_admin", permissions: COMPANY_ADMIN_PERMISSIONS, authorized_companies: [COMPANY],
  };
  await page.route("**/api/v1/auth/session", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: sessionData, meta: { request_id: "company-admin-ux" } }) }));
  await page.route("**/api/v1/auth/login", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { access_token: session.accessToken, token_type: "Bearer", ...sessionData }, meta: { request_id: "company-admin-ux" } }) }));
  await page.route("**/api/v1/companies", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [COMPANY] }, meta: { request_id: "company-admin-ux" } }) }));
  await page.route("**/api/v1/news-intake/status", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { intake_ready: true, management_identity: { status: "ready", ready: true, has_effective_context: true } }, meta: { request_id: "company-admin-ux" } }) }));
  await page.route("**/api/v1/inbox/emails", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [] }, meta: { request_id: "company-admin-ux" } }) }));
}

test("company admin manages only members in the active company", async ({ page }) => {
  let members = [
    { membership_id: "membership-company-admin", user_id: "user:company-admin@example.com", tenant_id: "tenant-a", company_id: "company-a", role: "company_admin", status: "active", version: 1 },
    { membership_id: "membership-analyst", user_id: "user:analyst@example.com", tenant_id: "tenant-a", company_id: "company-a", role: "analyst", status: "active", version: 2 },
    { membership_id: "membership-other-company", user_id: "user:other@example.com", tenant_id: "tenant-a", company_id: "company-b", role: "viewer", status: "active", version: 1 },
  ];
  const requests = [];
  await seedCompanyAdmin(page);
  await page.route((url) => url.pathname === "/api/v1/company/memberships", async (route) => {
    if (route.request().method() === "GET") {
      const scopedMembers = members.filter((item) => item.company_id === "company-a");
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: scopedMembers, meta: { total: scopedMembers.length, company_id: "company-a" } }, meta: { request_id: "company-admin-ux" } }) });
    }
    const body = route.request().postDataJSON();
    requests.push({ method: route.request().method(), body, endpoint: new URL(route.request().url()).pathname });
    const created = { membership_id: "membership-reviewer", user_id: `user:${body.email}`, tenant_id: "tenant-a", company_id: "company-a", role: body.role, status: "invited", version: 1 };
    members = [...members, created];
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: { membership: created, reused: false }, meta: { request_id: "company-admin-ux" } }) });
  });
  await page.route((url) => url.pathname.startsWith("/api/v1/company/memberships/") && url, async (route) => {
    const membershipId = new URL(route.request().url()).pathname.split("/").pop();
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      requests.push({ method: "PATCH", body, endpoint: new URL(route.request().url()).pathname });
      members = members.map((item) => item.membership_id === membershipId ? { ...item, role: body.role, version: item.version + 1 } : item);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { membership: members.find((item) => item.membership_id === membershipId) }, meta: { request_id: "company-admin-ux" } }) });
    }
    if (route.request().method() === "DELETE") {
      requests.push({ method: "DELETE", body: null, endpoint: new URL(route.request().url()).pathname });
      members = members.map((item) => item.membership_id === membershipId ? { ...item, status: "revoked", version: item.version + 1 } : item);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { membership: members.find((item) => item.membership_id === membershipId), revoked: true }, meta: { request_id: "company-admin-ux" } }) });
    }
    return route.fallback();
  });

  await page.goto("/id/settings/access");
  await expect(page.getByRole("banner").getByRole("heading", { name: "Access", exact: true })).toBeVisible();
  await expect(page.getByText("Company administration")).toBeVisible();
  await expect(page.getByRole("main").getByText("Company A", { exact: true })).toBeVisible();
  await expect(page.getByText("other@example.com")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Companies", exact: true })).toHaveCount(0);
  await expect(page.getByText("Company access", { exact: true })).toHaveCount(0);
  const roleSelect = page.getByRole("combobox", { name: "Role" });
  await roleSelect.click();
  await expect(page.getByRole("option")).toHaveCount(6);
  const roleLabels = await page.getByRole("option").allTextContents();
  expect(roleLabels).toEqual(["Company admin", "Executive", "Executive viewer", "Analyst", "Reviewer", "Viewer"]);
  await page.keyboard.press("Escape");
  await expect(page).toHaveScreenshot("company-admin-access-initial.png", { fullPage: true });

  await page.getByLabel("Work email").fill("reviewer@example.com");
  await roleSelect.click();
  await page.getByRole("option", { name: "Reviewer", exact: true }).click();
  await page.getByRole("button", { name: "Invite member" }).click();
  await expect(page.getByRole("status")).toContainText("Invitation created");
  expect(requests[0]).toMatchObject({ method: "POST", endpoint: "/api/v1/company/memberships", body: { email: "reviewer@example.com", role: "reviewer" } });
  expect(requests[0].body).not.toHaveProperty("company_id");
  await expect(page.getByText("reviewer@example.com")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page).toHaveScreenshot("company-admin-access-after-invite.png", { fullPage: true });

  const analystRow = page.locator(".access-member-item").filter({ hasText: "analyst@example.com" });
  await analystRow.getByRole("button", { name: "Edit" }).click();
  const editRoleSelect = analystRow.getByRole("combobox", { name: "Edit role for analyst@example.com" });
  await editRoleSelect.click();
  await analystRow.getByRole("option", { name: "Executive viewer", exact: true }).click();
  await analystRow.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Access updated");
  expect(requests.find((request) => request.method === "PATCH")).toMatchObject({ endpoint: "/api/v1/company/memberships/membership-analyst", body: { role: "executive_viewer" } });
  await expect(page.getByText("Executive viewer · Company A")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page).toHaveScreenshot("company-admin-access-after-edit.png", { fullPage: true });

  const reviewerRow = page.locator(".access-member-item").filter({ hasText: "reviewer@example.com" });
  await reviewerRow.getByRole("button", { name: "Revoke" }).click();
  await expect(page.getByRole("alertdialog", { name: "Revoke access?" })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page).toHaveScreenshot("company-admin-access-revoke-confirmation.png", { fullPage: true });
  await page.getByRole("alertdialog", { name: "Revoke access?" }).getByRole("button", { name: "Revoke access" }).click();
  await expect(page.getByRole("status")).toContainText("Access revoked");
  expect(requests.find((request) => request.method === "DELETE")).toMatchObject({ endpoint: "/api/v1/company/memberships/membership-reviewer" });
  await expect(page.getByText("revoked", { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page).toHaveScreenshot("company-admin-access-after-revoke.png", { fullPage: true });

  await page.goto("/id/settings");
  await expect(page.getByRole("link", { name: /Company Context/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Alert preferences/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^News intake/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Display language/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Companies", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Audit log", exact: true })).toHaveCount(0);
  await expect(page).toHaveScreenshot("company-admin-settings-hub.png", { fullPage: true });
});

test("company admin can reach every assigned workspace surface", async ({ page }) => {
  test.setTimeout(90_000);
  const sessionData = {
    actor: { id: "user:company-admin@example.com", email: "company-admin@example.com", type: "human", role: "company_admin", membership_id: "membership-company-admin" },
    tenant_id: "tenant-a",
    company_id: "company-a",
    role: "company_admin",
    permissions: COMPANY_ADMIN_PERMISSIONS,
    authorized_companies: [COMPANY],
  };
  const context = {
    context_id: "context-company-a",
    company_id: "company-a",
    version: 2,
    status: "effective",
    fields: {
      company_name: "Company A",
      industry: "Technology",
      description: "Leadership context for Company A",
      products: ["Enterprise platform"],
      customers: ["Business customers"],
      regions: ["Indonesia"],
      priorities: ["Sustainable growth"],
      competitors: [],
      goals: [],
      risks: [],
      topics: [],
      dependencies: [],
    },
    management_identity: {
      status: "ready",
      context_version: 2,
      company_name: "Company A",
      lens_summary: "Leadership lens for Company A",
      fingerprint: "company-a-fingerprint",
      error_message: null,
      updated_at: "2026-08-01T00:00:00Z",
    },
    updated_by: "user:company-admin@example.com",
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
  };

  await page.addInitScript((value) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("egi_media_ai_session", JSON.stringify(value));
  }, {
    authenticated: true,
    accessToken: "company-admin-route-matrix-token",
    actor: { id: "user:company-admin@example.com", email: "company-admin@example.com", fullName: "Company Admin", role: "company_admin", actorType: "human" },
    permissions: COMPANY_ADMIN_PERMISSIONS,
    tenantId: "tenant-a",
    activeCompanyId: "company-a",
    authorizedCompanies: [COMPANY],
  });

  await page.route("**/api/v1/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.pathname;
    const method = route.request().method();
    let data = { items: [], meta: { page: 1, limit: 100, total: 0 } };

    if (path.endsWith("/auth/session")) data = sessionData;
    else if (path === "/api/v1/companies") data = { items: [COMPANY] };
    else if (path === "/api/v1/dashboard/executive-summary") data = { period: "24jam", startAt: "2026-08-01T00:00:00Z", endAt: "2026-08-02T00:00:00Z", items: [], issues: [], top5_limit: 20 };
    else if (path === "/api/v1/news-feed") data = { channel: requestUrl.searchParams.get("channel") || "egi_media", label: "EGI Media", layout: "card", provider: "cms", items: [], next_cursor: null };
    else if (path === "/api/v1/companies/company-a/context") data = context;
    else if (path === "/api/v1/companies/company-a/context/versions") data = { items: [context], meta: { total: 1 } };
    else if (path === "/api/v1/companies/company-a/alert-preference") data = { recipient_id: "company-a-alerts", direct_high_enabled: false, daily_digest_enabled: false, timezone: "Asia/Jakarta", quiet_hours: null };
    else if (path === "/api/v1/companies/company-a/language-preference") data = { language: "id" };
    else if (path === "/api/v1/news-intake/status") data = { automatic_intake: { desired: false, actual_running: false, enabled: false, running: false, interval_ms: 300000, batch_size: 20, locales: ["id"], last_enqueue_at: null, last_enqueue_status: null, last_error_code: null, last_job_id: null }, workers: { enabled: true, running: true }, pipeline: { configured: true }, intake_ready: true, management_identity: { ready: true, status: "ready", context_version: 2, has_effective_context: true } };
    else if (path === "/api/v1/news-intake/runs") data = { items: [], limit: 15, offset: 0, has_more: false, next_offset: null, next_cursor: null };
    else if (path === "/api/v1/inbox/emails" || path === "/api/v1/issues" || path === "/api/v1/saved/issues" || path === "/api/v1/reports") data = { items: [], meta: { page: 1, limit: 100, total: 0 } };

    await route.fulfill({ status: method === "GET" ? 200 : 200, contentType: "application/json", body: JSON.stringify({ success: true, data, meta: { request_id: "company-admin-route-matrix" } }) });
  });

  const surfaces = [
    ["/id", "Executive Summary", "company-admin-executive-summary.png"],
    ["/id/issues", "News Feed", "company-admin-news-feed.png"],
    ["/id/alerts", "Alerts", "company-admin-alerts.png"],
    ["/id/reports", "Reports", "company-admin-reports.png"],
    ["/id/saved", "Saved Issues", "company-admin-saved-issues.png"],
    ["/id/settings", "Settings", "company-admin-settings.png"],
    ["/id/settings/company-context", "Company Context", "company-admin-company-context.png"],
    ["/id/settings/company-context/versions", "Context history", "company-admin-context-history.png"],
    ["/id/settings/alert-preferences", "Alert preferences", "company-admin-alert-preferences.png"],
    ["/id/settings/news-intake", "News intake", "company-admin-news-intake.png"],
    ["/id/settings/display-language", "Display language", "company-admin-display-language.png"],
    ["/id/settings/access", "Access", "company-admin-access-route.png"],
  ];

  for (const [path, heading, screenshot] of surfaces) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, exact: true }).first()).toBeVisible();
    await expect(page.getByTestId("company-switcher")).toContainText("Company A");
    await expect(page.getByText("Access restricted", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Company scope required", { exact: false })).toHaveCount(0);
    await expect(page).toHaveScreenshot(screenshot, { fullPage: true });
  }
});
