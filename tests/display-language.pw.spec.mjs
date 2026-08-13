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

test.describe("Display language settings", () => {
  test.setTimeout(180_000);

  test("API + UI: GET confirmed, save en/id, prerequisite gate", async ({ page }) => {
    const { email: adminEmail, password: adminPassword } = bootstrapCreds();
    const stamp = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const ownerEmail = `lang-owner-${stamp}@example.com`;
    const ownerPassword = `LangPass-${stamp.slice(0, 12)}!`;

    const adminLogin = await apiJson("/api/v1/auth/login", {
      method: "POST",
      body: { email: adminEmail, password: adminPassword },
    });
    expect(adminLogin.status, JSON.stringify(adminLogin.json)).toBe(200);
    const platformToken = adminLogin.json.data.access_token;

    const tenant = await apiJson("/api/v1/platform/tenants", {
      method: "POST",
      token: platformToken,
      idempotencyKey: `lang-tenant-${stamp}`,
      body: { name: `Lang Tenant ${stamp}`, status: "active" },
    });
    expect(tenant.status, JSON.stringify(tenant.json)).toBe(201);
    const tenantId = tenant.json.data.tenant.tenant_id;

    const company = await apiJson(`/api/v1/platform/tenants/${tenantId}/companies`, {
      method: "POST",
      token: platformToken,
      idempotencyKey: `lang-company-${stamp}`,
      body: { name: `Lang Co ${stamp}`, status: "active" },
    });
    expect(company.status, JSON.stringify(company.json)).toBe(201);
    const companyId = company.json.data.company.company_id;

    const invite = await apiJson(`/api/v1/platform/tenants/${tenantId}/owner`, {
      method: "POST",
      token: platformToken,
      idempotencyKey: `lang-invite-${stamp}`,
      body: { email: ownerEmail, full_name: "Lang Owner", password: ownerPassword, company_id: companyId },
    });
    expect([200, 201], `invite failed: ${JSON.stringify(invite.json)}`).toContain(invite.status);

    const ownerLogin = await apiJson("/api/v1/auth/login", {
      method: "POST",
      body: { email: ownerEmail, password: ownerPassword },
    });
    expect(ownerLogin.status, JSON.stringify(ownerLogin.json)).toBe(200);
    const ownerToken = ownerLogin.json.data.access_token;
    expect(ownerLogin.json.data.company_id).toBe(companyId);

    const initial = await apiJson(`/api/v1/companies/${companyId}/language-preference`, {
      token: ownerToken,
    });
    expect(initial.status, JSON.stringify(initial.json)).toBe(200);
    expect(initial.json.data.language).toBe("id");

    const toEn = await apiJson(`/api/v1/companies/${companyId}/language-preference`, {
      method: "PATCH",
      token: ownerToken,
      idempotencyKey: `lang-en-${stamp}`,
      body: { language: "en" },
    });
    expect(toEn.status, JSON.stringify(toEn.json)).toBe(200);
    expect(toEn.json.data.language).toBe("en");

    const afterEn = await apiJson(`/api/v1/companies/${companyId}/language-preference`, {
      token: ownerToken,
    });
    expect(afterEn.status).toBe(200);
    expect(afterEn.json.data.language).toBe("en");

    const toId = await apiJson(`/api/v1/companies/${companyId}/language-preference`, {
      method: "PATCH",
      token: ownerToken,
      idempotencyKey: `lang-id-${stamp}`,
      body: { language: "id" },
    });
    expect(toId.status, JSON.stringify(toId.json)).toBe(200);
    expect(toId.json.data.language).toBe("id");

    const afterId = await apiJson(`/api/v1/companies/${companyId}/language-preference`, {
      token: ownerToken,
    });
    expect(afterId.status).toBe(200);
    expect(afterId.json.data.language).toBe("id");

    // UI happy path
    await page.goto("/id/login");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.getByLabel("Work email").fill(ownerEmail);
    await page.getByLabel("Password").fill(ownerPassword);
    await page.getByRole("button", { name: /Continue to workspace/i }).click();
    await expect(page).toHaveURL(/\/id\/?$/, { timeout: 30_000 });

    await page.goto("/id/settings/display-language");
    await expect(page.getByRole("heading", { name: /Display language/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Backend confirmed")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("display-language-load-error")).toHaveCount(0);

    await page.getByTestId("display-language-select").click();
    await page.getByRole("option", { name: "English", exact: true }).click();
    await page.getByTestId("display-language-save").click();
    await expect(page.getByText(/Display language preference saved/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Backend confirmed")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Backend confirmed")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("display-language-select")).toContainText("English");

    await page.getByTestId("display-language-select").click();
    await page.getByRole("option", { name: "Bahasa Indonesia", exact: true }).click();
    await page.getByTestId("display-language-save").click();
    await expect(page.getByText(/Display language preference saved/i)).toBeVisible({ timeout: 15_000 });
    await page.reload();
    await expect(page.getByTestId("display-language-select")).toContainText("Bahasa Indonesia");
    await expect(page.getByText("Backend confirmed")).toBeVisible();
    await expect(page.getByText("Resource was not found")).toHaveCount(0);

    // Prerequisite gate with no company
    await page.evaluate(() => {
      const raw = localStorage.getItem("egi_media_ai_session");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      parsed.activeCompanyId = null;
      localStorage.setItem("egi_media_ai_session", JSON.stringify(parsed));
    });
    await page.goto("/id/settings/display-language");
    await expect(page.getByTestId("prerequisite-gate")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Company required for display language/i)).toBeVisible();
    await expect(page.getByText("Resource was not found")).toHaveCount(0);
  });
});
