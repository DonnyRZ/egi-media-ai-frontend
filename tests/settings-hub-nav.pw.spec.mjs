import { test, expect } from "@playwright/test";

const EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL || "egi.egiholding@gmail.com";
const PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD || "EgiMedia123!";

const BLOCKED_CARDS = [
  { testId: "settings-hub-card-companies", blockedBy: "tenant", title: /Cannot open Companies/i, reason: /tenant/i },
  { testId: "settings-hub-card-company-context", blockedBy: "company", title: /Cannot open Company Context/i, reason: /active company/i },
  { testId: "settings-hub-card-context-draft-flow", blockedBy: "company", title: /Cannot open Context draft flow/i, reason: /draft/i },
  { testId: "settings-hub-card-alert-preferences", blockedBy: "company", title: /Cannot open Alert preferences/i, reason: /Alert preferences/i },
];

/** Pins provisioning state so the contextual next step is deterministic. */
async function stubProvisioningState(page, { tenants, companies, memberships }) {
  await page.route((url) => /\/api\/v1\/platform\/tenants\/[^/]+\/memberships/.test(url.pathname), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { items: memberships, meta: { page: 1, limit: 100, total: memberships.length } } }),
    });
  });
  await page.route((url) => /\/api\/v1\/platform\/tenants\/[^/]+\/companies/.test(url.pathname), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { items: companies, meta: { page: 1, limit: 100, total: companies.length } } }),
    });
  });
  await page.route((url) => /\/api\/v1\/platform\/tenants\/?$/.test(url.pathname), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { items: tenants, meta: { page: 1, limit: 100, total: tenants.length } } }),
    });
  });
}

async function realLogin(page) {
  await page.goto("/id/login");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.getByLabel("Work email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /Continue to workspace/i }).click();
  await expect(page).toHaveURL(/\/id\/?$/, { timeout: 30_000 });
  await expect(page.locator(".app-sidebar")).toBeVisible({ timeout: 60_000 });
}

async function openSettingsFromSidebar(page) {
  await page.locator(".app-sidebar").getByRole("link", { name: /^Settings/i }).click();
  await expect(page.getByRole("heading", { name: /^Settings$/i })).toBeVisible({ timeout: 15_000 });
}

test.describe("Settings hub Open cards (soft-nav)", () => {
  test.describe.configure({ timeout: 180_000 });

  test("hub cards look openable and show per-card block dialog when scope is missing", async ({ page }) => {
    await realLogin(page);
    await openSettingsFromSidebar(page);

    for (const card of BLOCKED_CARDS) {
      const control = page.getByTestId(card.testId);
      await expect(control).toBeVisible();
      await expect(control).toHaveAttribute("data-blocked-by", card.blockedBy);
      await expect(control.getByText("Open →")).toBeVisible();

      await control.click();
      const dialog = page.getByTestId("settings-hub-block-dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("heading", { name: card.title })).toBeVisible();
      await expect(dialog.getByTestId("settings-hub-block-reason")).toContainText(card.reason);
      await expect(dialog).toHaveAttribute("data-guidance-state", "ready", { timeout: 15_000 });
      await expect(dialog.getByTestId("settings-hub-block-body")).not.toBeEmpty();
      await dialog.getByRole("button", { name: /Got it/i }).click();
      await expect(dialog).toHaveCount(0);
    }
  });

  test("next step follows real provisioning state, not a fixed Provisioning link", async ({ page }) => {
    await realLogin(page);
    await stubProvisioningState(page, {
      tenants: [{ tenant_id: "tenant:stub", name: "Stub Tenant" }],
      companies: [{ company_id: "company:stub", name: "Stub Company" }],
      memberships: [
        { user_id: "user:owner.stub@example.com", role: "tenant_owner", status: "invited", company_id: "company:stub" },
      ],
    });
    await openSettingsFromSidebar(page);

    await page.getByTestId("settings-hub-card-company-context").click();
    const dialog = page.getByTestId("settings-hub-block-dialog");
    await expect(dialog).toHaveAttribute("data-guidance-state", "ready", { timeout: 15_000 });
    const body = dialog.getByTestId("settings-hub-block-body");
    await expect(body).toContainText("owner.stub@example.com");
    await expect(body).toContainText(/Nothing left to do in Provisioning/i);
    await expect(dialog.getByRole("link", { name: /Open Provisioning/i })).toHaveCount(0);
    await expect(dialog.getByRole("link", { name: /Open signup page/i })).toBeVisible();
  });

  test("block dialog Open Provisioning soft-navs to platform", async ({ page }) => {
    await realLogin(page);
    await stubProvisioningState(page, { tenants: [], companies: [], memberships: [] });
    await openSettingsFromSidebar(page);

    await page.getByTestId("settings-hub-card-companies").click();
    await page.getByTestId("settings-hub-block-dialog").getByRole("link", { name: /Open Provisioning/i }).click();
    await expect(page).toHaveURL(/\/id\/settings\/platform/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /Customer provisioning|Platform administration only/i }).first(),
    ).toBeVisible({ timeout: 15_000 });

    await openSettingsFromSidebar(page);
    await page.getByTestId("settings-hub-card-company-context").click();
    await page.getByTestId("settings-hub-block-dialog").getByRole("link", { name: /Open Provisioning/i }).click();
    await expect(page).toHaveURL(/\/id\/settings\/platform/, { timeout: 15_000 });
  });

  test("hard refresh on gated settings subroutes still shows gates", async ({ page }) => {
    await realLogin(page);
    const paths = [
      { url: "/id/settings/companies", heading: /Companies|Tenant required for companies|Company administration restricted/i },
      { url: "/id/settings/company-context", heading: /Company required for company context|Company Context|No effective context/i },
      { url: "/id/settings/company-context/draft", heading: /Company required for context draft|Build Company Context/i },
      { url: "/id/settings/alert-preferences", heading: /Company required for alert preferences|Alert preferences/i },
      { url: "/id/settings/access", heading: /Access control|Tenant required for access|Access restricted/i },
    ];

    for (const route of paths) {
      await page.goto(route.url);
      await page.reload();
      await expect(page).toHaveURL(new RegExp(route.url.replace(/\//g, "\\/")));
      await expect(page.locator(".shell-content h1, .shell-content h2").filter({ hasText: route.heading }).first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.locator(".settings-hub > h1").filter({ hasText: /^Settings$/ })).toHaveCount(0);
    }
  });

  test("race: open Settings then Provisioning from company block dialog", async ({ page }) => {
    await realLogin(page);
    await stubProvisioningState(page, { tenants: [], companies: [], memberships: [] });
    await page.locator(".app-sidebar").getByRole("link", { name: /^Settings/i }).click();
    const card = page.getByTestId("settings-hub-card-company-context");
    await card.waitFor({ state: "visible", timeout: 10_000 });
    await card.click();
    await page.getByTestId("settings-hub-block-dialog").getByRole("link", { name: /Open Provisioning/i }).click();

    await expect(page).toHaveURL(/\/id\/settings\/platform/, { timeout: 5_000 });
    await expect(
      page.getByRole("heading", { name: /Customer provisioning|Platform administration only/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".settings-hub > h1").filter({ hasText: /^Settings$/ })).toHaveCount(0);
    await expect(page.locator(".app-shell")).not.toHaveAttribute("data-pending-href", "/settings");
  });
});
