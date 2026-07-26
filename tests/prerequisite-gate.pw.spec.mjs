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
  await expect(page.locator(".app-sidebar")).toBeVisible({ timeout: 60_000 });
}

test.describe("Sprint 0 PrerequisiteGate smoke", () => {
  test.setTimeout(90_000);

  test("platform_superadmin without tenant sees Companies gate + Provisioning CTA", async ({ page }) => {
    await loginAsBootstrapAdmin(page);

    const scope = await page.evaluate(() => {
      const raw = localStorage.getItem("egi_media_ai_session");
      const parsed = raw ? JSON.parse(raw) : null;
      return {
        tenantId: parsed?.tenantId ?? null,
        activeCompanyId: parsed?.activeCompanyId ?? null,
        role: parsed?.actor?.role ?? null,
      };
    });
    expect(scope.tenantId, "bootstrap admin should have no tenant for this smoke").toBeFalsy();

    await page.goto("/id/settings/companies");
    await page.waitForLoadState("networkidle");

    const gate = page.getByTestId("prerequisite-gate");
    await expect(gate).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Tenant required for companies/i })).toBeVisible();
    await expect(page.getByTestId("prerequisite-gate-reason")).toContainText(/no tenant/i);
    await expect(page.getByTestId("prerequisite-gate-next")).toContainText(/Platform provisioning/i);

    // Create form / misleading admin chrome must not be the primary view
    await expect(page.getByLabel("Company name")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Create company/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /^Companies$/ })).toHaveCount(0);
    await expect(page.getByText("Companies are unavailable.")).toHaveCount(0);

    const provisioningCta = page.getByRole("link", { name: /Open Provisioning/i });
    await expect(provisioningCta).toBeVisible();
    await expect(provisioningCta).toHaveAttribute("href", /\/settings\/platform/);

    await provisioningCta.click();
    await expect(page).toHaveURL(/\/id\/settings\/platform/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /Customer provisioning|Platform administration only/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
