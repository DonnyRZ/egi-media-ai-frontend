const PLATFORM_PERMISSIONS = [
  "platform.tenants.manage",
  "platform.companies.manage",
  "platform.memberships.manage",
  "dashboard.read",
  "issue.read",
  "company_context.read",
  "report.read",
  "alert.read",
];

export async function loginAsPlatformSuperadmin(page, { tenantId = null, companyId = null, authorizedCompanies = [] } = {}) {
  const session = {
    authenticated: true,
    accessToken: "scope-platform-token",
    actor: { id: "scope-platform-admin", email: "platform@example.test", fullName: "Platform Administrator", role: "platform_superadmin", actorType: "human" },
    permissions: PLATFORM_PERMISSIONS,
    tenantId,
    activeCompanyId: companyId,
    authorizedCompanies,
  };
  const sessionData = {
    actor: { id: session.actor.id, email: session.actor.email, type: "human", role: session.actor.role, membership_id: null },
    tenant_id: tenantId,
    company_id: companyId,
    role: session.actor.role,
    permissions: PLATFORM_PERMISSIONS,
    authorized_companies: authorizedCompanies,
  };

  await page.addInitScript((value) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("egi_media_ai_session", JSON.stringify(value));
  }, session);
  await page.route("**/api/v1/auth/session", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: sessionData, meta: { request_id: "scope-test" } }),
  }));
  await page.route("**/api/v1/auth/login", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        access_token: session.accessToken,
        token_type: "Bearer",
        actor: { id: session.actor.id, email: session.actor.email, role: session.actor.role, type: "human" },
        tenant_id: tenantId,
        company_id: companyId,
        permissions: PLATFORM_PERMISSIONS,
        authorized_companies: authorizedCompanies,
      },
      meta: { request_id: "scope-test" },
    }),
  }));
  await page.route("**/api/v1/companies", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { items: authorizedCompanies }, meta: { request_id: "scope-test" } }),
  }));
  // Platform admins have a canonical control-plane route. Start there so
  // tests exercise provisioning after the redirect has settled rather than
  // racing the AppShell's /id -> /settings/platform guard.
  await page.goto("/id/settings/platform");
}

export { PLATFORM_PERMISSIONS };
