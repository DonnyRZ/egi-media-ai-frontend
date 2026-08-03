import { test, expect } from "@playwright/test";

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

async function mockAuthAndFeed(page, onFeedRequest, unavailableChannel = null) {
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
    const channel = url.searchParams.get("channel") || "egi_media";
    onFeedRequest?.(channel, url);
    if (channel === unavailableChannel) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { channel, label: channel === "detik" ? "Detik" : channel, layout: "card", provider: "crawl", items: [], next_cursor: null, availability: "unavailable" },
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
          channel,
          label: channel === "egi_media" ? "EGI Media" : channel === "detik" ? "Detik" : channel,
          layout: "card",
          provider: channel === "egi_media" ? "cms" : "crawl",
          items: [
            feedItem({
              channel,
              provider: channel === "egi_media" ? "cms" : "crawl",
              title: channel === "detik" ? "Detik story" : "EGI Media headline",
              thumbnail_url: channel === "egi_media" ? "https://example.com/thumb.jpg" : null,
            }),
          ],
          next_cursor: null,
        },
        meta: { request_id: "nf" },
      }),
    });
  });
}

test.describe("news feed channel strip", () => {
  test("defaults to egi_media and switches across visible channels", async ({ page }) => {
    const requested = [];
    await seedSession(page);
    await mockAuthAndFeed(page, (channel) => requested.push(channel));

    await page.goto("/id/issues");
    await expect(page.getByRole("heading", { name: "News Feed" })).toBeVisible();

    const tabs = page.locator('[data-testid="news-feed-tabs"] button[data-channel]');
    await expect(tabs).toHaveCount(18);
    await expect(tabs.first()).toHaveAttribute("data-channel", "egi_media");
    await expect(tabs.last()).toHaveAttribute("data-channel", "tribunnews");
    await expect(page.locator('[data-testid="news-feed-tabs"] button[data-channel="viral"]')).toHaveCount(0);

    const egiTab = page.locator('[data-testid="news-feed-tabs"] button[data-channel="egi_media"]');
    await expect(egiTab).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => requested.at(-1)).toBe("egi_media");

    await expect(page.getByTestId("news-feed-card-grid")).toBeVisible();
    await expect(page.locator('.news-feed-card[data-has-thumb="true"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "EGI Media headline" })).toBeVisible();

    await page.locator('[data-testid="news-feed-tabs"] button[data-channel="detik"]').click();
    await expect.poll(() => requested.at(-1)).toBe("detik");
    await expect(page.getByRole("heading", { name: "Detik story" })).toBeVisible();
    await expect(page).toHaveScreenshot("news-feed-detik.png", { fullPage: true });
  });

  test("reports an unavailable provider without placeholder marketing copy", async ({ page }) => {
    await seedSession(page);
    await mockAuthAndFeed(page, undefined, "detik");
    await page.goto("/id/issues");
    await page.locator('[data-testid="news-feed-tabs"] button[data-channel="detik"]').click();
    await expect(page.getByRole("heading", { name: "Source unavailable" })).toBeVisible();
    await expect(page.getByText(/Coming soon/i)).toHaveCount(0);
    await expect(page).toHaveScreenshot("news-feed-source-unavailable.png", { fullPage: true });
  });
});
