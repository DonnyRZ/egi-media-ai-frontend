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

async function assertNoTenantScope(page) {
  const scope = await page.evaluate(() => {
    const raw = localStorage.getItem("egi_media_ai_session");
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      tenantId: parsed?.tenantId ?? null,
      activeCompanyId: parsed?.activeCompanyId ?? null,
      role: parsed?.actor?.role ?? null,
    };
  });
  expect(scope.tenantId, "bootstrap admin should have no tenant for Sprint 1 matrix").toBeFalsy();
  return scope;
}

async function assertTenantGate(page, heading) {
  const gate = page.getByTestId("prerequisite-gate");
  await expect(gate).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  await expect(page.getByTestId("prerequisite-gate-reason")).toContainText(/no tenant/i);
  await expect(page.getByTestId("prerequisite-gate-next")).toContainText(/Platform provisioning/i);
  await expect(page.getByRole("link", { name: /Open Provisioning/i })).toBeVisible();
}

test.describe("Sprint 1 tenant-admin surfaces without tenant", () => {
  test.setTimeout(120_000);

  test("settings hub Companies looks openable; click shows tenant-specific block dialog", async ({ page }) => {
    await loginAsBootstrapAdmin(page);
    await assertNoTenantScope(page);
    await page.route((url) => /\/api\/v1\/platform\/tenants\/?$/.test(url.pathname), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { items: [], meta: { page: 1, limit: 100, total: 0 } } }),
      });
    });

    await page.locator(".app-sidebar").getByRole("link", { name: /^Settings/i }).click();
    await expect(page.getByRole("heading", { name: /^Settings$/i })).toBeVisible({ timeout: 15_000 });

    const companies = page.getByTestId("settings-hub-card-companies");
    await expect(companies).toBeVisible();
    await expect(companies).toHaveAttribute("data-blocked-by", "tenant");
    await expect(companies.getByText("Open →")).toBeVisible();
    await expect(page.getByTestId("settings-hub-setup-reason")).toHaveCount(0);

    await companies.click();
    const dialog = page.getByTestId("settings-hub-block-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: /Cannot open Companies/i })).toBeVisible();
    await expect(dialog.getByTestId("settings-hub-block-reason")).toContainText(/tenant/i);
    await expect(dialog).toHaveAttribute("data-guidance-state", "ready", { timeout: 15_000 });
    await expect(dialog.getByTestId("settings-hub-block-body")).toContainText(/no customer tenant exists yet/i);

    await dialog.getByRole("link", { name: /Open Provisioning/i }).click();
    await expect(page).toHaveURL(/\/id\/settings\/platform/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /Customer provisioning|Platform administration only/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("sidebar Access opens gate — not invite form + Memberships unavailable", async ({ page }) => {
    await loginAsBootstrapAdmin(page);
    await assertNoTenantScope(page);

    const accessLink = page.locator(".app-sidebar").getByRole("link", { name: /^Access$/i });
    await expect(accessLink).toBeVisible({ timeout: 10_000 });
    await accessLink.click();

    await expect(page).toHaveURL(/\/id\/settings\/access/, { timeout: 10_000 });
    await assertTenantGate(page, /Tenant required for access/i);

    await expect(page.getByLabel("Work email")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Grant access/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /^Access control$/ })).toHaveCount(0);
    await expect(page.getByText("Memberships are unavailable.")).toHaveCount(0);
  });

  test("soft-nav + deep link + hard refresh: companies and access gates", async ({ page }) => {
    await loginAsBootstrapAdmin(page);
    await assertNoTenantScope(page);

    // Soft-nav via sidebar Access
    await page.locator(".app-sidebar").getByRole("link", { name: /^Access$/i }).click();
    await expect(page).toHaveURL(/\/id\/settings\/access/);
    await assertTenantGate(page, /Tenant required for access/i);

    // Soft-nav via sidebar Settings still shows hub with Companies Open card (blocked on click)
    await page.locator(".app-sidebar").getByRole("link", { name: /^Settings/i }).click();
    await expect(page.getByTestId("settings-hub-card-companies")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("settings-hub-card-companies").getByText("Open →")).toBeVisible();

    // Deep link companies
    await page.goto("/id/settings/companies");
    await page.waitForLoadState("networkidle");
    await assertTenantGate(page, /Tenant required for companies/i);
    await expect(page.getByLabel("Company name")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Create company/i })).toHaveCount(0);
    await expect(page.getByText("Companies are unavailable.")).toHaveCount(0);

    // Deep link access
    await page.goto("/id/settings/access");
    await page.waitForLoadState("networkidle");
    await assertTenantGate(page, /Tenant required for access/i);
    await expect(page.getByText("Memberships are unavailable.")).toHaveCount(0);

    // Hard refresh equivalent on both
    await page.reload();
    await assertTenantGate(page, /Tenant required for access/i);

    await page.goto("/id/settings/companies");
    await page.reload();
    await assertTenantGate(page, /Tenant required for companies/i);
  });

  test("Provisioning control plane still fully works", async ({ page }) => {
    await loginAsBootstrapAdmin(page);
    await assertNoTenantScope(page);

    await page.goto("/id/settings/platform");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /Customer provisioning|Platform administration only/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
    // Platform admin chrome must mount (not a tenant PrerequisiteGate)
    await expect(page.getByTestId("prerequisite-gate")).toHaveCount(0);
    await expect(page.getByLabel(/Tenant name|Customer name|Name/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("gate CTA from Access reaches Provisioning", async ({ page }) => {
    await loginAsBootstrapAdmin(page);
    await page.goto("/id/settings/access");
    await assertTenantGate(page, /Tenant required for access/i);

    await page.getByRole("link", { name: /Open Provisioning/i }).click();
    await expect(page).toHaveURL(/\/id\/settings\/platform/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /Customer provisioning|Platform administration only/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
