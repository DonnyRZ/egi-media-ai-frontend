import { test, expect } from "@playwright/test";
import { newsFeedChannelsResponse } from "./support/news-feed-channels.mjs";

const feedItem = (overrides = {}) => ({
  id: "cms:article-1",
  channel: "egi_media",
  provider: "cms",
  layout: "card",
  title: "EGI Media headline",
  summary: "A validated feed summary for the news feed card layout.",
  published_at: "2026-01-02T00:00:00Z",
  source_url: "https://example.com/story",
  thumbnail_url: "https://example.com/thumb.jpg",
  crawl_source_id: null,
  issue_source_id: "cms:article-1",
  ...overrides,
});

async function seedSession(page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "egi_media_ai_session",
      JSON.stringify({
        authenticated: true,
        accessToken: "news-feed-e2e-token",
        actor: {
          id: "dummy-actor",
          email: "executive@example.com",
          fullName: "Executive User",
          role: "human_reviewer",
          actorType: "human",
        },
        permissions: ["dashboard.read"],
        tenantId: "dummy-tenant",
        activeCompanyId: "company-a",
        authorizedCompanies: [{ company_id: "company-a", name: "Company A", tenant_id: "dummy-tenant" }],
      }),
    );
  });
}

async function mockAuthAndFeed(page, onFeedRequest, { unavailable = false, paginated = false } = {}) {
  await page.route("**/api/v1/auth/session", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          actor: { id: "dummy-actor", email: "executive@example.com", type: "human", role: "human_reviewer", membership_id: "m1" },
          tenant_id: "dummy-tenant",
          company_id: "company-a",
          role: "human_reviewer",
          permissions: ["dashboard.read"],
          authorized_companies: [{ company_id: "company-a", name: "Company A", tenant_id: "dummy-tenant" }],
        },
        meta: { request_id: "nf" },
      }),
    }),
  );
  await page.route("**/api/v1/companies**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { items: [{ company_id: "company-a", name: "Company A", tenant_id: "dummy-tenant" }] },
        meta: { request_id: "nf" },
      }),
    }),
  );
  await page.route("**/api/v1/news-feed**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes("/news-feed/channels")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(newsFeedChannelsResponse()),
      });
      return;
    }
    onFeedRequest?.(url);
    if (unavailable) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { channel: "mixed", label: "News Feed", layout: "card", provider: "crawl", items: [], next_cursor: null, availability: "unavailable" },
          meta: { request_id: "nf" },
        }),
      });
      return;
    }
    if (paginated) {
      const cursor = url.searchParams.get("cursor");
      const pageNumber = cursor ? 2 : 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            channel: "mixed",
            label: "News Feed",
            layout: "card",
            provider: "crawl",
            items: [
              feedItem({
                id: "crawl:article-" + pageNumber,
                channel: "detik",
                provider: "crawl",
                source_label: "Detik",
                title: "Detik page " + pageNumber,
                thumbnail_url: null,
              }),
            ],
            next_cursor: cursor ? null : "cursor-page-2",
          },
          meta: { request_id: "nf" },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          channel: "mixed",
          label: "News Feed",
          layout: "card",
          provider: "crawl",
          items: [
            feedItem({
              id: "crawl:detik:hash-1",
              channel: "detik",
              provider: "crawl",
              source_label: "Detik",
              title: "Cloud security update",
              thumbnail_url: "https://example.com/thumb.jpg",
            }),
            feedItem({
              id: "crawl:tempo:hash-2",
              channel: "tempo",
              provider: "crawl",
              source_label: "Tempo",
              title: "Kecerdasan buatan di industri",
              thumbnail_url: null,
            }),
          ],
          next_cursor: null,
        },
        meta: { request_id: "nf" },
      }),
    });
  });
}

test.describe("news feed mixed list", () => {
  test("shows one mixed page without media tabs", async ({ page }) => {
    const requested = [];
    await seedSession(page);
    await mockAuthAndFeed(page, (url) => requested.push(url.searchParams.get("view")));

    await page.goto("/id/issues");
    await expect(page.getByRole("heading", { name: "News Feed" })).toBeVisible();
    await expect(page.locator('[data-testid="news-feed-tabs"]')).toHaveCount(0);
    await expect.poll(() => requested.at(-1)).toBe("mixed");
    await expect(page.getByTestId("news-feed-card-grid")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cloud security update" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Kecerdasan buatan di industri" })).toBeVisible();
    await expect(page.getByText("Detik", { exact: true })).toBeVisible();
    await expect(page.getByText("Tempo", { exact: true })).toBeVisible();
  });

  test("reports an unavailable provider without placeholder marketing copy", async ({ page }) => {
    await seedSession(page);
    await mockAuthAndFeed(page, undefined, { unavailable: true });
    await page.goto("/id/issues");
    await expect(page.getByRole("heading", { name: "Source unavailable" })).toBeVisible();
    await expect(page.getByText(/Coming soon/i)).toHaveCount(0);
  });

  test("loads the next cursor instead of silently stopping after the first page", async ({ page }) => {
    const requests = [];
    await seedSession(page);
    await mockAuthAndFeed(page, (url) => requests.push(url.search), { paginated: true });
    await page.goto("/id/issues");

    await expect(page.getByRole("heading", { name: "Detik page 1" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Load more stories" })).toBeVisible();
    await page.getByRole("button", { name: "Load more stories" }).click();
    await expect(page.getByRole("heading", { name: "Detik page 2" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Load more stories" })).toHaveCount(0);
    expect(requests.some((search) => search.includes("cursor=cursor-page-2"))).toBe(true);
  });
});
