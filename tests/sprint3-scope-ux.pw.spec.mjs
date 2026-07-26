import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

function bootstrapCreds() {
  const envPath = path.resolve("..", "egi-media-ai-backend", ".env");
  const raw = fs.readFileSync(envPath, "utf8");
  const email = (raw.match(/^BOOTSTRAP_ADMIN_EMAIL=(.*)$/m) || [])[1]?.trim();
  const password = (raw.match(/^BOOTSTRAP_ADMIN_PASSWORD=(.*)$/m) || [])[1]?.trim();
  if (!email || !password) throw new Error("Missing BOOTSTRAP_ADMIN_* in backend .env");
  return { email, password };
}

async function loginAsBootstrapAdmin(page) {
  const { email, password } = bootstrapCreds();
  await page.goto("/id/login");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /Continue to workspace/i }).click();
  await expect(page).toHaveURL(/\/id\/?$/, { timeout: 30_000 });
  await expect(page.locator(".app-sidebar")).toBeVisible({ timeout: 20_000 });
}

async function assertNoCompanyScope(page) {
  const scope = await page.evaluate(() => {
    const raw = localStorage.getItem("egi_media_ai_session");
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      tenantId: parsed?.tenantId ?? null,
      activeCompanyId: parsed?.activeCompanyId ?? null,
      role: parsed?.actor?.role ?? null,
    };
  });
  expect(scope.activeCompanyId, "bootstrap admin should have no active company for Sprint 3").toBeFalsy();
  return scope;
}

const SCOPED_ROUTES = [
  {
    url: "/id",
    softLabel: /Executive Summary/i,
    heading: /Company scope required for Executive Summary/i,
    forbid: [/No active signals in this period/i],
  },
  {
    url: "/id/issues",
    softLabel: /All Issues/i,
    heading: /Company scope required for issues/i,
    forbid: [/No issues yet/i],
  },
  {
    url: "/id/alerts",
    softLabel: /Alerts/i,
    heading: /Company scope required for alerts/i,
    forbid: [/No archived alerts/i],
  },
  {
    url: "/id/reports",
    softLabel: /Reports/i,
    heading: /Company scope required for reports/i,
    forbid: [/No reports yet/i],
  },
  {
    url: "/id/saved",
    softLabel: /^Saved/i,
    heading: /Company scope required for saved issues/i,
    forbid: [/No saved issues/i],
  },
];

async function assertCompanyScopeGate(page, heading) {
  const gate = page.getByTestId("prerequisite-gate");
  await expect(gate).toBeVisible({ timeout: 15_000 });
  await expect(gate).toHaveAttribute("data-missing", /company/);
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  await expect(page.getByTestId("prerequisite-gate-reason")).toContainText(/company/i);
  await expect(page.getByRole("link", { name: /Open Provisioning/i })).toBeVisible();
}

test.describe("Sprint 3 operational surfaces without company", () => {
  test.setTimeout(120_000);

  test("company switcher empty state explains next step + Provisioning", async ({ page }) => {
    await loginAsBootstrapAdmin(page);
    await assertNoCompanyScope(page);

    await expect(page.getByTestId("company-switcher")).toBeVisible();
    await expect(page.getByTestId("company-switcher")).toHaveAttribute("data-has-company", "false");
    await expect(page.getByTestId("company-switcher")).toContainText(/No company selected/i);

    await page.getByTestId("company-switcher").click();
    const popover = page.getByTestId("company-switcher-popover");
    await expect(popover).toBeVisible({ timeout: 10_000 });

    // Wait past loading into empty or error explanatory panel
    await expect(page.getByTestId("company-switcher-empty").or(page.getByTestId("company-switcher-error"))).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("company-switcher-next").or(page.getByTestId("company-switcher-error"))).toContainText(
      /Provisioning|provision/i,
    );

    const cta = popover.getByRole("link", { name: /Open Provisioning/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", /\/settings\/platform/);
    await cta.click();
    await expect(page).toHaveURL(/\/id\/settings\/platform/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /Customer provisioning|Platform administration only/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("hard nav: exec/issues/alerts/reports/saved show scope gate not empty data", async ({ page }) => {
    await loginAsBootstrapAdmin(page);
    await assertNoCompanyScope(page);

    for (const route of SCOPED_ROUTES) {
      await page.goto(route.url);
      await page.waitForLoadState("networkidle");
      await assertCompanyScopeGate(page, route.heading);
      for (const pattern of route.forbid) {
        await expect(page.getByRole("heading", { name: pattern })).toHaveCount(0);
      }
    }
  });

  test("soft-nav sidebar: at least two routes keep scope gates", async ({ page }) => {
    await loginAsBootstrapAdmin(page);
    await assertNoCompanyScope(page);

    const softRoutes = [SCOPED_ROUTES[1], SCOPED_ROUTES[2]]; // Issues + Alerts
    for (const route of softRoutes) {
      await page.locator(".app-sidebar").getByRole("link", { name: route.softLabel }).click();
      await expect(page).toHaveURL(new RegExp(route.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "/?$"), { timeout: 15_000 });
      await assertCompanyScopeGate(page, route.heading);
      for (const pattern of route.forbid) {
        await expect(page.getByRole("heading", { name: pattern })).toHaveCount(0);
      }
    }
  });

  test("Sprint 1/2 regression: Settings Companies looks openable; deep link still tenant-gated", async ({ page }) => {
    await loginAsBootstrapAdmin(page);
    await assertNoCompanyScope(page);

    await page.locator(".app-sidebar").getByRole("link", { name: /^Settings/i }).click();
    await expect(page.getByRole("heading", { name: /^Settings$/i })).toBeVisible({ timeout: 15_000 });

    const companiesCard = page.getByTestId("settings-hub-card-companies");
    await expect(companiesCard).toBeVisible();
    await expect(companiesCard).toHaveAttribute("data-blocked-by", "tenant");
    await expect(companiesCard.getByText("Open →")).toBeVisible();

    await page.goto("/id/settings/companies");
    await expect(page.getByTestId("prerequisite-gate")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Tenant required for companies/i })).toBeVisible();
    await expect(page.getByLabel("Company name")).toHaveCount(0);
  });
});
