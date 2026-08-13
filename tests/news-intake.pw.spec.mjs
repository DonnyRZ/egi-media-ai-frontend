import { test, expect } from "@playwright/test";
import { newsFeedChannelsResponse } from "./support/news-feed-channels.mjs";

const OWNER_PERMISSIONS = [
  "dashboard.read",
  "news.intake.read",
  "news.intake.trigger",
  "news.intake.manage",
];

const COMPANY_ADMIN_PERMISSIONS = [
  "dashboard.read",
  "news.intake.read",
  "news.intake.trigger",
];

const VIEWER_PERMISSIONS = ["dashboard.read"];

const STATUS_OFF = {
  automatic_intake: {
    desired: false,
    actual_running: false,
    enabled: false,
    running: false,
    interval_ms: 300_000,
    batch_size: 20,
    locales: ["id"],
    last_enqueue_at: null,
    last_enqueue_status: null,
    last_error_code: null,
    last_job_id: null,
    desired_source: "api",
    desired_updated_at: "2026-07-27T00:00:00Z",
  },
  workers: { enabled: true, running: true },
  pipeline: { configured: true },
  intake_ready: true,
  management_identity: {
    ready: true,
    status: "ready",
    context_version: 1,
    has_effective_context: true,
  },
};

const STATUS_IDENTITY_BLOCKED = {
  ...STATUS_OFF,
  intake_ready: false,
  management_identity: {
    ready: false,
    status: "missing",
    context_version: 1,
    has_effective_context: true,
  },
};

const RUNS_PAGE = {
  items: [
    {
      id: "job-1",
      when: "2026-07-27T01:00:00Z",
      source: "egi-media-cms",
      mode: "poll",
      action: "poll",
      state: "succeeded",
      locale: "id",
      crawl_source_id: null,
      job_type: "cms.poll",
      family: "intake",
      reused: false,
      created_at: "2026-07-27T01:00:00Z",
      updated_at: "2026-07-27T01:01:00Z",
    },
  ],
  limit: 15,
  offset: 0,
  has_more: false,
  next_offset: null,
  next_cursor: null,
};

const RUNS_PAGE_MORE = {
  ...RUNS_PAGE,
  has_more: true,
  next_offset: 15,
  next_cursor: "cursor-page-2",
};

async function seedSession(page, permissions, role = "tenant_owner") {
  await page.addInitScript(
    ({ permissions: nextPermissions, role: nextRole }) => {
      localStorage.setItem(
        "egi_media_ai_session",
        JSON.stringify({
          authenticated: true,
          accessToken: "news-intake-e2e-token",
          actor: {
            id: "actor-1",
            email: "owner@example.com",
            fullName: "Owner User",
            role: nextRole,
            actorType: "human",
          },
          permissions: nextPermissions,
          tenantId: "tenant-a",
          activeCompanyId: "company-a",
          authorizedCompanies: [{ company_id: "company-a", name: "Company A", tenant_id: "tenant-a" }],
        }),
      );
    },
    { permissions, role },
  );
}

async function mockSessionAndCompanies(page, permissions, role = "tenant_owner") {
  await page.route("**/api/v1/auth/session", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          actor: { id: "actor-1", email: "owner@example.com", type: "human", role, membership_id: "m-1" },
          tenant_id: "tenant-a",
          company_id: "company-a",
          role,
          permissions,
          authorized_companies: [{ company_id: "company-a", name: "Company A", tenant_id: "tenant-a" }],
        },
        meta: { request_id: "ni" },
      }),
    }),
  );
  await page.route("**/api/v1/companies**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { items: [{ company_id: "company-a", name: "Company A", tenant_id: "tenant-a" }] },
        meta: { request_id: "ni" },
      }),
    }),
  );
  await page.route("**/api/v1/news-feed/channels**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(newsFeedChannelsResponse()),
    }),
  );
}

test.describe("News intake settings (mock)", () => {
  test("owner: status, toggle, pull with Idempotency-Key, recent runs", async ({ page }) => {
    let status = structuredClone(STATUS_OFF);
    const pullBodies = [];
    const pullHeaders = [];

    await seedSession(page, OWNER_PERMISSIONS);
    await mockSessionAndCompanies(page, OWNER_PERMISSIONS);

    await page.route("**/api/v1/news-intake/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: status, meta: { request_id: "ni" } }),
      });
    });

    await page.route("**/api/v1/news-intake/automatic", async (route) => {
      const body = route.request().postDataJSON();
      status = {
        ...status,
        automatic_intake: {
          ...status.automatic_intake,
          desired: Boolean(body.desired),
          enabled: Boolean(body.desired),
          actual_running: Boolean(body.desired),
          running: Boolean(body.desired),
        },
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: status, meta: { request_id: "ni" } }),
      });
    });

    await page.route("**/api/v1/news-intake/pull", async (route) => {
      pullBodies.push(route.request().postDataJSON());
      pullHeaders.push(route.request().headers()["idempotency-key"] || "");
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "job-pull-1",
            action: "poll",
            state: "queued",
            reused: false,
            locale: "id",
            stages: [{ name: "intake", state: "queued", updated_at: "2026-07-27T02:00:00Z" }],
          },
          meta: { request_id: "ni" },
        }),
      });
    });

    await page.route("**/api/v1/news-intake/runs**", async (route) => {
      const url = new URL(route.request().url());
      const offset = Number(url.searchParams.get("offset") || "0");
      const limit = Number(url.searchParams.get("limit") || "15");
      expect(limit).toBe(15);
      const pageData =
        offset === 0
          ? RUNS_PAGE_MORE
          : {
              ...RUNS_PAGE,
              items: [
                {
                  ...RUNS_PAGE.items[0],
                  id: "job-2",
                  when: "2026-07-26T12:00:00Z",
                  state: "queued",
                },
              ],
              offset: 15,
              has_more: false,
              next_offset: null,
              next_cursor: null,
            };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: pageData, meta: { request_id: "ni" } }),
      });
    });

    await page.goto("/id/settings/news-intake");
    await expect(page.getByRole("heading", { name: "News intake" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("news-intake-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Automatic intake" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pull articles now" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent runs" })).toBeVisible();
    await expect(page.getByTestId("news-intake-automatic-status")).toContainText(/Off/i);
    await expect(page.getByTestId("news-intake-automatic-status")).toContainText(/every 5 minutes/i);
    await expect(page.getByTestId("news-intake-page").getByText(/pipeline|scheduler|ingest|enqueue/i)).toHaveCount(0);
    await expect(page.getByTestId("news-intake-page").getByText(/Company scope/i)).toHaveCount(0);

    await page.getByTestId("news-intake-automatic-switch").click();
    await expect(page.getByTestId("news-intake-notice")).toContainText(/Automatic intake is on/i);
    await expect(page.getByTestId("news-intake-automatic-switch")).toHaveAttribute("aria-checked", "true");

    await page.getByTestId("news-intake-pull-now").click();
    await expect(page.getByTestId("news-intake-notice")).toContainText(/Pull accepted/i);
    expect(pullBodies).toHaveLength(1);
    expect(pullBodies[0]).toMatchObject({ mode: "poll", locale: "id", limit: 20 });
    expect(pullHeaders[0].length).toBeGreaterThanOrEqual(16);
    expect(pullHeaders[0].length).toBeLessThanOrEqual(255);

    await expect(page.getByTestId("news-intake-runs-table")).toBeVisible();
    await expect(page.getByText("EGI Media pull")).toBeVisible();
    await expect(page.getByText("succeeded")).toBeVisible();
    await expect(page.getByTestId("news-intake-runs-page-label")).toHaveText("Page 1");
    await expect(page.getByTestId("news-intake-runs-prev")).toBeDisabled();
    await expect(page.getByTestId("news-intake-runs-next")).toBeEnabled();
    await page.getByTestId("news-intake-runs-next").click();
    await expect(page.getByTestId("news-intake-runs-page-label")).toHaveText("Page 2");
    await expect(page.getByRole("cell", { name: "queued" })).toBeVisible();
    await expect(page.getByTestId("news-intake-runs-next")).toBeDisabled();
    await page.getByTestId("news-intake-runs-prev").click();
    await expect(page.getByTestId("news-intake-runs-page-label")).toHaveText("Page 1");
  });

  test("company_admin: manage switch disabled; trigger enabled", async ({ page }) => {
    await seedSession(page, COMPANY_ADMIN_PERMISSIONS, "company_admin");
    await mockSessionAndCompanies(page, COMPANY_ADMIN_PERMISSIONS, "company_admin");

    await page.route("**/api/v1/news-intake/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: STATUS_OFF, meta: { request_id: "ni" } }),
      });
    });
    await page.route("**/api/v1/news-intake/runs**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { ...RUNS_PAGE, items: [] },
          meta: { request_id: "ni" },
        }),
      });
    });

    await page.goto("/id/settings/news-intake");
    await expect(page.getByTestId("news-intake-page")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("news-intake-automatic-switch")).toBeDisabled();
    await expect(page.getByText(/cannot change it/i)).toBeVisible();
    await expect(page.getByTestId("news-intake-pull-now")).toBeEnabled();
  });

  test("without read: locked forbidden state", async ({ page }) => {
    await seedSession(page, VIEWER_PERMISSIONS, "viewer");
    await mockSessionAndCompanies(page, VIEWER_PERMISSIONS, "viewer");

    await page.goto("/id/settings/news-intake");
    await expect(page.getByRole("heading", { name: /News intake is restricted|Access restricted/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("news-intake-page")).toHaveCount(0);
  });

  test("external media pull sends crawl-poll for one media id", async ({ page }) => {
    const pullBodies = [];
    await seedSession(page, OWNER_PERMISSIONS);
    await mockSessionAndCompanies(page, OWNER_PERMISSIONS);

    await page.route("**/api/v1/news-intake/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: STATUS_OFF, meta: { request_id: "ni" } }),
      });
    });
    await page.route("**/api/v1/news-intake/runs**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { ...RUNS_PAGE, items: [] },
          meta: { request_id: "ni" },
        }),
      });
    });
    await page.route("**/api/v1/news-intake/pull", async (route) => {
      pullBodies.push(route.request().postDataJSON());
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "job-crawl-1",
            action: "crawl-poll",
            state: "queued",
            reused: false,
            locale: "en",
            stages: [{ name: "intake", state: "queued", updated_at: "2026-07-27T02:00:00Z" }],
          },
          meta: { request_id: "ni" },
        }),
      });
    });

    await page.goto("/id/settings/news-intake");
    await expect(page.getByTestId("news-intake-page")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("tab", { name: "External media" }).click();
    await page.getByTestId("news-intake-external-media").click();
    await page.getByRole("option", { name: "Tempo", exact: true }).click();
    await page.getByTestId("news-intake-locale").click();
    await page.getByRole("option", { name: "English (en)", exact: true }).click();
    await page.getByTestId("news-intake-limit").fill("5");
    await page.getByTestId("news-intake-pull-now").click();
    await expect(page.getByTestId("news-intake-notice")).toContainText(/Pull accepted/i);
    expect(pullBodies[0]).toMatchObject({
      mode: "crawl-poll",
      crawl_source_id: "tempo",
      locale: "en",
      limit: 5,
    });
    expect(pullBodies[0].content).toBeUndefined();
  });

  test("blocks pull and automatic when management identity is not ready", async ({ page }) => {
    await seedSession(page, OWNER_PERMISSIONS);
    await mockSessionAndCompanies(page, OWNER_PERMISSIONS);

    await page.route("**/api/v1/news-intake/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: STATUS_IDENTITY_BLOCKED, meta: { request_id: "ni" } }),
      });
    });
    await page.route("**/api/v1/news-intake/runs**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { ...RUNS_PAGE, items: [] },
          meta: { request_id: "ni" },
        }),
      });
    });

    await page.goto("/id/settings/news-intake");
    await expect(page.getByTestId("news-intake-page")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("news-intake-identity-block")).toContainText(/Management identity must be ready/i);
    await expect(page.getByTestId("news-intake-pull-now")).toBeDisabled();
    await expect(page.getByTestId("news-intake-automatic-switch")).toBeDisabled();
    await expect(page.getByTestId("news-intake-pull-blocked-note")).toBeVisible();
  });

  test("maps MANAGEMENT_IDENTITY_REQUIRED on pull", async ({ page }) => {
    await seedSession(page, OWNER_PERMISSIONS);
    await mockSessionAndCompanies(page, OWNER_PERMISSIONS);

    await page.route("**/api/v1/news-intake/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: STATUS_OFF, meta: { request_id: "ni" } }),
      });
    });
    await page.route("**/api/v1/news-intake/runs**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { ...RUNS_PAGE, items: [] },
          meta: { request_id: "ni" },
        }),
      });
    });
    await page.route("**/api/v1/news-intake/pull", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: {
            code: "MANAGEMENT_IDENTITY_REQUIRED",
            message: "Management identity must be ready before news intake or judgmental AI tasks",
          },
          meta: { request_id: "ni" },
        }),
      });
    });

    await page.goto("/id/settings/news-intake");
    await expect(page.getByTestId("news-intake-page")).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("news-intake-pull-now").click();
    await expect(page.getByTestId("news-intake-notice")).toContainText(/Management identity must be ready/i);
  });
});
