import { test, expect } from "@playwright/test";

const COMPANY = { company_id: "company-a", tenant_id: "tenant-a", name: "Company A", status: "active" };
const PERMISSIONS = ["dashboard.read", "issue.read", "alert.read", "report.read"];

function envelope(data) {
  return { success: true, data, meta: { request_id: "deep-interaction-states" } };
}

async function seedCustomer(page, sessionPermissions = PERMISSIONS) {
  const session = {
    authenticated: true,
    accessToken: "deep-interaction-token",
    actor: { id: "user:customer@example.test", email: "customer@example.test", fullName: "Customer User", role: "tenant_owner", actorType: "human" },
    permissions: sessionPermissions,
    tenantId: "tenant-a",
    activeCompanyId: "company-a",
    authorizedCompanies: [COMPANY],
  };
  const sessionData = {
    actor: { id: session.actor.id, email: session.actor.email, type: "human", role: session.actor.role, membership_id: "membership-customer" },
    tenant_id: "tenant-a",
    company_id: "company-a",
    role: session.actor.role,
    permissions: sessionPermissions,
    authorized_companies: [COMPANY],
  };

  await page.addInitScript((value) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("egi_media_ai_session", JSON.stringify(value));
  }, session);
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data = { items: [], meta: { page: 1, limit: 50, total: 0 } };
    if (path === "/api/v1/auth/session") data = sessionData;
    if (path === "/api/v1/companies") data = { items: [COMPANY] };
    if (path === "/api/v1/inbox/emails") data = { items: [], meta: { page: 1, limit: 50, total: 0 } };
    if (path === "/api/v1/dashboard/executive-summary") data = { period: "24jam", startAt: "2026-08-01T00:00:00Z", endAt: "2026-08-02T00:00:00Z", items: [], issues: [], top5_limit: 5 };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(envelope(data)) });
  });
}

test.describe("deep interaction and loading states", () => {
  test("header menus close on outside click and Escape, preserving focus", async ({ page }) => {
    await seedCustomer(page);
    await page.goto("/id/settings");
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();

    const companyTrigger = page.getByTestId("company-switcher");
    await companyTrigger.click();
    await expect(page.getByTestId("company-switcher-popover")).toBeVisible();
    await expect(page).toHaveScreenshot("header-company-switcher-open.png", { fullPage: false });
    await page.mouse.click(800, 500);
    await expect(page.getByTestId("company-switcher-popover")).toHaveCount(0);

    await companyTrigger.click();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("company-switcher-popover")).toHaveCount(0);
    await expect(companyTrigger).toBeFocused();

    const notificationTrigger = page.getByRole("button", { name: "Notifications" });
    await notificationTrigger.click();
    await expect(page.getByRole("dialog", { name: "Notifications" })).toBeVisible();
    await page.mouse.click(800, 500);
    await expect(page.getByRole("dialog", { name: "Notifications" })).toHaveCount(0);

    const profileTrigger = page.locator(".profile-button");
    await profileTrigger.click();
    await expect(page.locator(".user-popover")).toBeVisible();
    await page.mouse.click(800, 500);
    await expect(page.locator(".user-popover")).toHaveCount(0);
  });

  test("Executive Summary period control follows the Mockup segmented pattern", async ({ page }) => {
    await seedCustomer(page);
    await page.goto("/id");
    const period = page.getByRole("group", { name: "Summary period" });
    await expect(period).toBeVisible();
    await expect(page.getByRole("button", { name: "24 hours" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "7 days" }).click();
    await expect(page.getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveScreenshot("executive-summary-period-tabs.png", { fullPage: false });
  });

  test("collection empty states use a consistent visual language", async ({ page }) => {
    await seedCustomer(page);
    await page.route("**/api/v1/inbox/emails", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(envelope({ items: [], meta: { page: 1, limit: 50, total: 0 } })) }));
    await page.route("**/api/v1/reports**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(envelope({ items: [], meta: { page: 1, limit: 50, total: 0 } })) }));
    await page.route("**/api/v1/saved/issues", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(envelope({ items: [], meta: { page: 1, limit: 100, total: 0 } })) }));

    for (const [path, title, screenshot] of [
      ["/id/alerts", "No urgent alerts yet", "alerts-empty-state.png"],
      ["/id/reports", "No reports yet", "reports-empty-state.png"],
      ["/id/saved", "No saved issues", "saved-empty-state.png"],
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
      await expect(page.locator(".issues-empty-mark")).toBeVisible();
      await expect(page).toHaveScreenshot(screenshot, { fullPage: true });
    }
  });

  test("alert action failure remains visible and actionable", async ({ page }) => {
    await seedCustomer(page);
    const alert = { email_id: "email-1", issue_id: "issue-1", development_id: null, channel: "langsung", status: "delivered", reason_code: "high_priority", read: false, created_at: "2026-08-01T00:00:00Z" };
    await page.route((url) => url.pathname === "/api/v1/inbox/emails", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(envelope({ items: [alert], meta: { page: 1, limit: 50, total: 1 } })) }));
    await page.route((url) => url.pathname === "/api/v1/inbox/emails/email-1/read", async (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "Alert state could not be saved right now." } }) }));

    await page.goto("/id/alerts");
    await expect(page.getByRole("button", { name: "Mark read" })).toBeVisible();
    await page.getByRole("button", { name: "Mark read" }).click();
    await expect(page.locator(".preference-notice[role='alert']")).toContainText("Alert state could not be saved right now.");
    await expect(page.getByRole("button", { name: "Mark read" })).toBeEnabled();
    await expect(page).toHaveScreenshot("alerts-action-error.png", { fullPage: true });
  });

  test("alerts use channel tabs and open a concise grounded reader", async ({ page }) => {
    await seedCustomer(page);
    const direct = { email_id: "email-grounded-1", issue_id: "issue-grounded-1", development_id: "development-grounded-1", channel: "langsung", status: "delivered", reason_code: "high_priority", read: false, created_at: "2026-08-01T00:00:00Z", alert_content: { type: "direct", new_development: "Regulator mempercepat penerapan aturan.", short_impact: "Jadwal kepatuhan dan biaya operasi perlu ditinjau.", source_claim_ids: ["claim-1"], generated_at: "2026-08-01T00:01:00Z" } };
    const digest = { email_id: "email-digest-1", issue_id: "issue-digest-1", development_id: null, channel: "ringkasan", status: "delivered", reason_code: "daily_digest", read: true, created_at: "2026-08-01T00:00:00Z", alert_content: null };
    await page.route((url) => url.pathname === "/api/v1/inbox/emails", async (route) => {
      const channel = new URL(route.request().url()).searchParams.get("channel");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(envelope({ items: [channel === "ringkasan" ? digest : direct], meta: { page: 1, limit: 20, total: 1, unread_by_channel: { langsung: 1, ringkasan: 0 } } })) });
    });
    await page.route((url) => url.pathname === "/api/v1/inbox/emails/email-grounded-1/read", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(envelope({ ...direct, read: true })) }));

    await page.goto("/id/alerts");
    await expect(page.getByRole("tab", { name: /Urgent alerts/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Regulator mempercepat penerapan aturan/ })).toBeVisible();
    await expect(page).toHaveScreenshot("alerts-grounded-list.png", { fullPage: true });

    await page.getByRole("button", { name: /Regulator mempercepat penerapan aturan/ }).click();
    const dialog = page.getByRole("dialog", { name: "Alert detail" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "New development" })).toBeVisible();
    await expect(dialog.getByText("Jadwal kepatuhan dan biaya operasi perlu ditinjau.")).toBeVisible();
    await expect(page).toHaveScreenshot("alerts-grounded-reader.png", { fullPage: false });
    await dialog.getByRole("button", { name: "Close alert detail" }).click();

    await page.getByRole("tab", { name: "Daily digest" }).click();
    await expect(page.getByRole("button", { name: /Daily digest/ }).last()).toBeVisible();
    await expect(page).toHaveScreenshot("alerts-daily-digest-tab.png", { fullPage: true });
  });

  test("report detail keeps a close affordance while the detail request is loading", async ({ page }) => {
    await seedCustomer(page);
    const report = { report_id: "report-loading", report_type: "mingguan", period_start: "2026-08-01", period_end: "2026-08-08", timezone: "Asia/Jakarta", context_version: 2, metrics: {}, selected_issue_pack: [], review_status: "draft", version: 1, created_at: "2026-08-01T00:00:00Z", updated_at: "2026-08-01T00:00:00Z" };
    await page.route("**/api/v1/reports?**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(envelope({ items: [report], meta: { page: 1, limit: 50, total: 1 } })) }));
    await page.route("**/api/v1/reports/report-loading", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(envelope({ report, narrative: null, activity: [] })) });
    });

    await page.goto("/id/reports");
    await page.getByText(/01 Aug 2026/).click();
    const dialog = page.getByRole("dialog", { name: "Report detail" });
    await expect(dialog.getByRole("button", { name: "Close report detail" })).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(page).toHaveScreenshot("report-detail-loading-closeable.png", { fullPage: false });
    await dialog.getByRole("button", { name: "Close report detail" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("access members stay paginated at an enterprise-safe page size", async ({ page }) => {
    await seedCustomer(page, [...PERMISSIONS, "tenant.users.manage"]);
    const members = Array.from({ length: 41 }, (_, index) => ({
      membership_id: "membership-" + (index + 1),
      user_id: "user:member-" + String(index + 1).padStart(2, "0") + "@example.test",
      tenant_id: "tenant-a",
      company_id: index % 2 === 0 ? "company-a" : null,
      role: "analyst",
      status: "active",
      version: 1,
      permissions: [],
    }));
    await page.route((url) => url.pathname === "/api/v1/tenant/memberships", async (route) => {
      const requestUrl = new URL(route.request().url());
      const pageNumber = Number(requestUrl.searchParams.get("page") || 1);
      const limit = Number(requestUrl.searchParams.get("limit") || 20);
      const start = (pageNumber - 1) * limit;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(envelope({ items: members.slice(start, start + limit), meta: { page: pageNumber, limit, total: members.length } })),
      });
    });

    await page.goto("/id/settings/access");
    await expect(page.getByRole("heading", { name: "People with access" })).toBeVisible();
    await expect(page.getByText("Showing 1–20 of 41 members", { exact: true })).toBeVisible();
    await expect(page.getByText("Page 1 of 3", { exact: true })).toBeVisible();
    await expect(page.locator(".access-member-item")).toHaveCount(20);
    await expect(page.locator(".access-members-panel")).toHaveScreenshot("access-members-page-one.png");

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Page 2 of 3", { exact: true })).toBeVisible();
    await expect(page.getByText("Showing 21–40 of 41", { exact: true })).toBeVisible();
    await expect(page.locator(".access-member-item")).toHaveCount(20);
    await expect(page.locator(".access-members-panel")).toHaveScreenshot("access-members-page-two.png");
  });

  test("large alert, report, and saved collections expose the next page", async ({ page }) => {
    await seedCustomer(page);
    const alerts = Array.from({ length: 41 }, (_, index) => ({
      email_id: `email-${index + 1}`,
      issue_id: `issue-${index + 1}`,
      development_id: null,
      channel: "langsung",
      status: "delivered",
      reason_code: "high_priority",
      read: index % 2 === 0,
      created_at: "2026-08-01T00:00:00Z",
    }));
    const reports = Array.from({ length: 41 }, (_, index) => ({
      report_id: `report-${index + 1}`,
      report_type: "mingguan",
      period_start: "2026-08-01",
      period_end: "2026-08-08",
      timezone: "Asia/Jakarta",
      context_version: 2,
      metrics: {},
      selected_issue_pack: [],
      review_status: "draft",
      version: 1,
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    }));
    const saved = Array.from({ length: 41 }, (_, index) => ({
      saved_id: `saved-${index + 1}`,
      issue_id: `issue-${index + 1}`,
      saved_at: "2026-08-01T00:00:00Z",
      issue: {
        issue_id: `issue-${index + 1}`,
        title: `Saved issue ${index + 1}`,
        one_liner: "A company-scoped saved issue.",
        priority: "sedang",
        first_seen_at: "2026-08-01T00:00:00Z",
        last_developed_at: null,
        version: 1,
      },
    }));
    await page.route((url) => ["/api/v1/inbox/emails", "/api/v1/reports", "/api/v1/saved/issues"].includes(url.pathname), async (route) => {
      const requestUrl = new URL(route.request().url());
      const pageNumber = Number(requestUrl.searchParams.get("page") || 1);
      const limit = Number(requestUrl.searchParams.get("limit") || 20);
      const start = (pageNumber - 1) * limit;
      const path = requestUrl.pathname;
      const items = path === "/api/v1/inbox/emails" ? alerts.slice(start, start + limit) : path === "/api/v1/reports" ? reports.slice(start, start + limit) : saved.slice(start, start + limit);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(envelope({ items, meta: { page: pageNumber, limit, total: 41 } })),
      });
    });

    for (const [path, firstTitle, screenshot] of [
      ["/id/alerts", "Urgent alert", "alerts-pagination-page-one.png"],
      ["/id/reports", "01 Aug 2026", "reports-pagination-page-one.png"],
      ["/id/saved", "Saved issue 1", "saved-pagination-page-one.png"],
    ]) {
      await page.goto(path);
      await expect(page.getByText(firstTitle, { exact: false }).first()).toBeVisible();
      await expect(page.getByText("Showing 1-20 of 41", { exact: false })).toBeVisible();
      await expect(page.getByText("Page 1 of 3", { exact: true })).toBeVisible();
      await expect(page.locator(".collection-pagination")).toHaveScreenshot(screenshot);
      await page.getByRole("button", { name: "Next page" }).click();
      await expect(page.getByText("Page 2 of 3", { exact: true })).toBeVisible();
      await expect(page.getByText("Showing 21-40 of 41", { exact: false })).toBeVisible();
    }
  });

  test("tenant company registry follows backend pagination", async ({ page }) => {
    await seedCustomer(page, [...PERMISSIONS, "tenant.companies.manage"]);
    const companies = Array.from({ length: 41 }, (_, index) => ({
      company_id: `company-${index + 1}`,
      tenant_id: "tenant-a",
      name: `Company ${index + 1}`,
      status: "active",
    }));
    await page.route((url) => url.pathname === "/api/v1/tenant/companies", async (route) => {
      const requestUrl = new URL(route.request().url());
      const pageNumber = Number(requestUrl.searchParams.get("page") || 1);
      const limit = Number(requestUrl.searchParams.get("limit") || 20);
      const start = (pageNumber - 1) * limit;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(envelope({ items: companies.slice(start, start + limit), meta: { page: pageNumber, limit, total: companies.length } })),
      });
    });

    await page.goto("/id/settings/companies");
    await expect(page.getByText("41 companies", { exact: true })).toBeVisible();
    await expect(page.getByText("Showing 1-20 of 41", { exact: false }).first()).toBeVisible();
    await expect(page.locator(".company-admin-row")).toHaveCount(20);
    await expect(page).toHaveScreenshot("company-registry-page-one.png", { fullPage: true });
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByText("Showing 21-40 of 41", { exact: false }).first()).toBeVisible();
    await expect(page.locator(".company-admin-row")).toHaveCount(20);
  });
});
