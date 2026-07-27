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

async function mockAuthAndFeed(page, onFeedRequest) {
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
    if (channel === "viral") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            channel: "viral",
            label: "Viral",
            layout: "text",
            provider: "viral_x",
            items: [],
            next_cursor: null,
            availability: "coming_soon",
            message: "Coming soon",
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
  test("defaults to egi_media, switches channel, viral coming soon, card with thumb", async ({ page }) => {
    const requested = [];
    await seedSession(page);
    await mockAuthAndFeed(page, (channel) => requested.push(channel));

    await page.goto("/id/issues");
    await expect(page.getByRole("heading", { name: "News Feed" })).toBeVisible();

    const tabs = page.locator('[data-testid="news-feed-tabs"] button[data-channel]');
    await expect(tabs).toHaveCount(19);
    await expect(tabs.first()).toHaveAttribute("data-channel", "viral");
    await expect(tabs.nth(1)).toHaveAttribute("data-channel", "egi_media");
    await expect(tabs.last()).toHaveAttribute("data-channel", "tribunnews");

    const egiTab = page.locator('[data-testid="news-feed-tabs"] button[data-channel="egi_media"]');
    await expect(egiTab).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => requested.at(-1)).toBe("egi_media");

    await expect(page.getByTestId("news-feed-card-grid")).toBeVisible();
    await expect(page.locator('.news-feed-card[data-has-thumb="true"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "EGI Media headline" })).toBeVisible();

    await page.locator('[data-testid="news-feed-tabs"] button[data-channel="detik"]').click();
    await expect.poll(() => requested.at(-1)).toBe("detik");
    await expect(page.getByRole("heading", { name: "Detik story" })).toBeVisible();

    await page.locator('[data-testid="news-feed-tabs"] button[data-channel="viral"]').click();
    await expect.poll(() => requested.at(-1)).toBe("viral");
    await expect(page.getByRole("heading", { name: "Coming soon" })).toBeVisible();
    await expect(page.getByText(/Viral coverage will appear here|Coming soon/i).first()).toBeVisible();
  });
});
