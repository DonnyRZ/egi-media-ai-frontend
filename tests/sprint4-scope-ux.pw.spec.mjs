import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const API_BASE = process.env.EGI_API_URL || "http://127.0.0.1:5003";

function bootstrapCreds() {
  const envPath = path.resolve("..", "egi-media-ai-backend", ".env");
  const raw = fs.readFileSync(envPath, "utf8");
  const email = (raw.match(/^BOOTSTRAP_ADMIN_EMAIL=(.*)$/m) || [])[1]?.trim();
  const password = (raw.match(/^BOOTSTRAP_ADMIN_PASSWORD=(.*)$/m) || [])[1]?.trim();
  if (!email || !password) throw new Error("Missing BOOTSTRAP_ADMIN_* in backend .env");
  return { email, password };
}

async function apiJson(pathname, { method = "GET", token, body, idempotencyKey } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
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

async function provisionFreshScope(adminToken) {
  const stamp = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const tenantName = `Sprint4 Tenant ${stamp}`;
  const companyName = `Sprint4 Co ${stamp}`;
  const ownerEmail = `sprint4-owner-${stamp}@example.com`;

  const tenant = await apiJson("/api/v1/platform/tenants", {
    method: "POST",
    token: adminToken,
    idempotencyKey: `s4-tenant-${stamp}`,
    body: { name: tenantName, status: "active" },
  });
  expect(tenant.status, JSON.stringify(tenant.json)).toBe(201);
  const tenantId = tenant.json.data.tenant.tenant_id;

  const company = await apiJson(`/api/v1/platform/tenants/${tenantId}/companies`, {
    method: "POST",
    token: adminToken,
    idempotencyKey: `s4-company-${stamp}`,
    body: { name: companyName, status: "active" },
  });
  expect(company.status, JSON.stringify(company.json)).toBe(201);
  const companyId = company.json.data.company.company_id;
  expect(company.json.data.company.tenant_id).toBe(tenantId);

  return { tenantId, tenantName, companyId, companyName, ownerEmail, stamp };
}

test.describe("Sprint 4 post-provision owner chain", () => {
  test.setTimeout(180_000);

  test("assign owner next-steps + owner signup lands company in switcher with tenant_id", async ({ page }) => {
    const { email: adminEmail, password: adminPassword } = bootstrapCreds();
    const adminLogin = await apiJson("/api/v1/auth/login", {
      method: "POST",
      body: { email: adminEmail, password: adminPassword },
    });
    expect(adminLogin.status).toBe(200);
    const platformToken = adminLogin.json.data.access_token;
    expect(adminLogin.json.data.tenant_id ?? null).toBeNull();
    expect(adminLogin.json.data.company_id ?? null).toBeNull();

    const scope = await provisionFreshScope(platformToken);

    // Prefer listing EGI Resources / AGAT when present (DoD); fresh Sprint4 scope covers the chain either way.
    await loginAsBootstrapAdmin(page);
    await page.goto("/id/settings/platform");
    await expect(page.getByRole("heading", { name: /Customer provisioning/i })).toBeVisible({ timeout: 20_000 });
    // Wait for soft-nav optimistic remount to settle on the RSC page instance.
    await page.waitForTimeout(500);
    const egiRow = page.locator(".access-row").filter({ hasText: /EGI Resources/i });
    if ((await egiRow.count()) > 0) {
      await expect(egiRow.first()).toBeVisible();
      await egiRow.first().getByRole("button", { name: /^Select$/i }).click();
      await expect(page.getByRole("heading", { name: /Companies for EGI Resources/i })).toBeVisible();
      const agat = page.locator(".access-row").filter({ hasText: /AGAT/i });
      if ((await agat.count()) > 0) {
        await expect(agat.first()).toBeVisible();
      }
    }

    // Assign owner on the fresh Sprint4 tenant via UI.
    await page.locator(".access-row").filter({ hasText: scope.tenantName }).getByRole("button", { name: /^Select$/i }).click();
    await expect(page.getByRole("heading", { name: new RegExp(`Companies for ${scope.tenantName}`) })).toBeVisible();
    await expect(page.locator(".access-row").filter({ hasText: scope.companyName })).toBeVisible({ timeout: 15_000 });

    const ownerEmailInput = page.getByLabel("Owner email");
    await expect(ownerEmailInput).toBeVisible();
    await ownerEmailInput.fill(scope.ownerEmail);
    await page.getByLabel("Owner full name").fill("Sprint4 Owner");
    await page.getByLabel("Owner company").selectOption({ label: scope.companyName });
    await page.getByRole("button", { name: /Assign owner/i }).click();

    const next = page.getByTestId("provisioning-owner-next-steps");
    await expect(next).toBeVisible({ timeout: 15_000 });
    await expect(next).toContainText(/Tenant owner assigned/i);
    await expect(next).toContainText(scope.ownerEmail);
    await expect(next).toContainText(/invited/i);
    await expect(next).toContainText(/signs up/i);
    await expect(next).toContainText(/Company scope switcher/i);
    await expect(next).toContainText(/platform admin session stays unscoped/i);
    await expect(next.getByRole("link", { name: /Open signup page/i })).toBeVisible();

    // Platform switcher remains empty / unscoped (Path A — no unsafe auto-scope).
    await expect(page.getByTestId("company-switcher")).toHaveAttribute("data-has-company", "false");

    // Activate invite via signup, then login — authorized_companies must carry tenant_id.
    const ownerPassword = `S4Owner-${scope.stamp}!a`;
    const signup = await apiJson("/api/v1/auth/signup", {
      method: "POST",
      body: { email: scope.ownerEmail, full_name: "Sprint4 Owner", password: ownerPassword },
    });
    expect(signup.status, `signup failed: ${JSON.stringify(signup.json)}`).toBe(201);

    const ownerLogin = await apiJson("/api/v1/auth/login", {
      method: "POST",
      body: { email: scope.ownerEmail, password: ownerPassword },
    });
    expect(ownerLogin.status).toBe(200);
    const authorized = ownerLogin.json?.data?.authorized_companies || [];
    expect(authorized.length).toBeGreaterThan(0);
    expect(
      authorized.some((item) => item.company_id === scope.companyId && item.tenant_id === scope.tenantId),
    ).toBeTruthy();
    const authorizedTarget = authorized.find((item) => item.company_id === scope.companyId);
    expect(authorizedTarget?.name).toBeTruthy();
    expect(String(authorizedTarget.name)).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(ownerLogin.json.data.company_id).toBe(scope.companyId);
    expect(ownerLogin.json.data.tenant_id).toBe(scope.tenantId);

    const companiesList = await apiJson("/api/v1/companies", {
      token: ownerLogin.json.data.access_token,
    });
    expect(companiesList.status).toBe(200);
    const listedTarget = (companiesList.json?.data?.items || []).find((item) => item.company_id === scope.companyId);
    expect(listedTarget, "company list should include provisioned company").toBeTruthy();
    expect(listedTarget.tenant_id).toBe(scope.tenantId);
    expect(listedTarget.name).toBeTruthy();
    expect(String(listedTarget.name)).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    // Owner UI: company in switcher with tenant_id; hasCompany true (login auto-scope or select).
    await page.goto("/id/login");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.getByLabel("Work email").fill(scope.ownerEmail);
    await page.getByLabel("Password").fill(ownerPassword);
    await page.getByRole("button", { name: /Continue to workspace/i }).click();
    await expect(page).toHaveURL(/\/id\/?$/, { timeout: 30_000 });
    await expect(page.locator(".app-sidebar")).toBeVisible({ timeout: 60_000 });

    const switcher = page.getByTestId("company-switcher");
    await expect(switcher).toBeVisible();

    async function assertSwitcherOption() {
      await switcher.click();
      const option = page.locator(`[data-testid="company-switcher-option"][data-company-id="${scope.companyId}"]`).first();
      await expect(option).toBeVisible({ timeout: 10_000 });
      await expect(option).toHaveAttribute("data-tenant-id", scope.tenantId);
      return option;
    }

    if ((await switcher.getAttribute("data-has-company")) !== "true") {
      const option = await assertSwitcherOption();
      await option.click();
      await expect(page.getByTestId("company-switcher")).toHaveAttribute("data-has-company", "true", { timeout: 30_000 });
    } else {
      await assertSwitcherOption();
      await page.keyboard.press("Escape");
    }

    await expect(page.getByTestId("company-switcher")).toHaveAttribute("data-has-company", "true");
    await expect(page.getByTestId("company-switcher")).toContainText(String(authorizedTarget.name));
    await expect(page.getByTestId("company-switcher")).not.toContainText(scope.companyId);
  });
});
