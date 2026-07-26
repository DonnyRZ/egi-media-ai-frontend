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
  expect(scope.activeCompanyId, "bootstrap admin should have no active company for Sprint 2 matrix").toBeFalsy();
  return scope;
}

async function assertCompanyGate(page, heading) {
  const gate = page.getByTestId("prerequisite-gate");
  await expect(gate).toBeVisible({ timeout: 15_000 });
  await expect(gate).toHaveAttribute("data-missing", /company/);
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  await expect(page.getByTestId("prerequisite-gate-reason")).toContainText(/active company|company/i);
  await expect(page.getByRole("link", { name: /Open Provisioning/i })).toBeVisible();
}

const COMPANY_CARDS = [
  { title: "Company Context", testId: "settings-hub-card-company-context", reason: /active company/i },
  { title: "Context draft flow", testId: "settings-hub-card-context-draft-flow", reason: /draft/i },
  { title: "Alert preferences", testId: "settings-hub-card-alert-preferences", reason: /Alert preferences/i },
];

/** Empty platform state keeps the contextual next step pinned to Provisioning. */
async function stubEmptyPlatformState(page) {
  await page.route((url) => /\/api\/v1\/platform\/tenants\/?$/.test(url.pathname), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { items: [], meta: { page: 1, limit: 100, total: 0 } } }),
    });
  });
}

const DEEP_LINKS = [
  {
    url: "/id/settings/company-context",
    heading: /Company required for company context/i,
    forbid: [/Build Company Context/i, /Generate draft/i, /Save preferences/i],
  },
  {
    url: "/id/settings/company-context/draft",
    heading: /Company required for context draft/i,
    forbid: [/Generate draft/i, /Where should the draft come from/i, /Build Company Context/i],
  },
  {
    url: "/id/settings/alert-preferences",
    heading: /Company required for alert preferences/i,
    forbid: [/Save preferences/i, /Company scope[\s\S]*Unavailable/i, /^Alert preferences$/],
  },
];

test.describe("Sprint 2 company-scoped surfaces without company", () => {
  test.setTimeout(120_000);

  test("settings hub Context/Draft/Alert look openable; click shows company-specific dialog", async ({ page }) => {
    await loginAsBootstrapAdmin(page);
    await assertNoCompanyScope(page);
    await stubEmptyPlatformState(page);

    await page.locator(".app-sidebar").getByRole("link", { name: /^Settings/i }).click();
    await expect(page.getByRole("heading", { name: /^Settings$/i })).toBeVisible({ timeout: 15_000 });

    for (const card of COMPANY_CARDS) {
      const control = page.getByTestId(card.testId);
      await expect(control).toBeVisible();
      await expect(control).toHaveAttribute("data-blocked-by", "company");
      await expect(control.getByText("Open →")).toBeVisible();

      await control.click();
      const dialog = page.getByTestId("settings-hub-block-dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("heading", { name: new RegExp(`Cannot open ${card.title}`, "i") })).toBeVisible();
      await expect(dialog.getByTestId("settings-hub-block-reason")).toContainText(card.reason);
      await expect(dialog).toHaveAttribute("data-guidance-state", "ready", { timeout: 15_000 });
      await expect(dialog.getByTestId("settings-hub-block-body")).toContainText(/Provisioning/i);
      await dialog.getByRole("button", { name: /Got it/i }).click();
      await expect(dialog).toHaveCount(0);
    }

    await page.getByTestId("settings-hub-card-company-context").click();
    await page.getByTestId("settings-hub-block-dialog").getByRole("link", { name: /Open Provisioning/i }).click();
    await expect(page).toHaveURL(/\/id\/settings\/platform/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /Customer provisioning|Platform administration only/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("deep links show company gate — not operable draft/alert forms", async ({ page }) => {
    await loginAsBootstrapAdmin(page);
    await assertNoCompanyScope(page);

    const pdfPosts = [];
    const draftPosts = [];
    const preferencePuts = [];
    page.on("request", (request) => {
      const url = request.url();
      const method = request.method();
      if (method === "POST" && /\/api\/v1\/company-context\/draft\/pdf/.test(url)) pdfPosts.push(url);
      if (method === "POST" && /\/api\/v1\/company-context\/draft(?!s)/.test(url) && !/\/pdf/.test(url)) draftPosts.push(url);
      if (method === "PUT" && /\/api\/v1\/.*alert.*preferenc/.test(url)) preferencePuts.push(url);
    });

    for (const route of DEEP_LINKS) {
      await page.goto(route.url);
      await page.waitForLoadState("networkidle");
      await assertCompanyGate(page, route.heading);

      for (const pattern of route.forbid) {
        await expect(page.getByRole("heading", { name: pattern })).toHaveCount(0);
      }
      await expect(page.getByTestId("context-draft-generate")).toHaveCount(0);
      await expect(page.getByTestId("alert-preferences-save")).toHaveCount(0);
      await expect(page.getByRole("button", { name: /Generate draft/i })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /Save preferences/i })).toHaveCount(0);
      await expect(page.getByText("Unavailable")).toHaveCount(0);
    }

    expect(pdfPosts, "no PDF draft POST without company").toEqual([]);
    expect(draftPosts, "no draft POST without company").toEqual([]);
    expect(preferencePuts, "no alert preference PUT without company").toEqual([]);
  });

  test("soft-nav + hard refresh: company gates stay closed", async ({ page }) => {
    await loginAsBootstrapAdmin(page);
    await assertNoCompanyScope(page);

    await page.locator(".app-sidebar").getByRole("link", { name: /^Settings/i }).click();
    await expect(page.getByTestId("settings-hub-card-context-draft-flow")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("settings-hub-card-context-draft-flow").getByText("Open →")).toBeVisible();

    await page.goto("/id/settings/company-context/draft");
    await assertCompanyGate(page, /Company required for context draft/i);
    await expect(page.getByRole("button", { name: /Generate draft/i })).toHaveCount(0);

    await page.reload();
    await assertCompanyGate(page, /Company required for context draft/i);

    await page.goto("/id/settings/alert-preferences");
    await assertCompanyGate(page, /Company required for alert preferences/i);
    await page.reload();
    await assertCompanyGate(page, /Company required for alert preferences/i);

    await page.getByRole("link", { name: /Open Provisioning/i }).click();
    await expect(page).toHaveURL(/\/id\/settings\/platform/, { timeout: 15_000 });
  });

  test("Provisioning + Sprint 1 Companies/Access gates still work", async ({ page }) => {
    await loginAsBootstrapAdmin(page);
    await assertNoCompanyScope(page);

    await page.goto("/id/settings/platform");
    await expect(
      page.getByRole("heading", { name: /Customer provisioning|Platform administration only/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("prerequisite-gate")).toHaveCount(0);

    await page.goto("/id/settings/companies");
    await expect(page.getByTestId("prerequisite-gate")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Tenant required for companies/i })).toBeVisible();
    await expect(page.getByLabel("Company name")).toHaveCount(0);

    await page.goto("/id/settings/access");
    await expect(page.getByTestId("prerequisite-gate")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Tenant required for access/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Grant access/i })).toHaveCount(0);
  });

  test("with seeded company scope: gates lift (no regress to blocked chrome)", async ({ page }) => {
    await loginAsBootstrapAdmin(page);

    // AuthGate refreshes /auth/session and overwrites localStorage company — stub company_id so hasCompany stays true.
    await page.route("**/api/v1/auth/session", async (route) => {
      try {
        const response = await route.fetch();
        const json = await response.json();
        if (json?.data) {
          json.data.company_id = json.data.company_id || "sprint2-seed-company";
          json.data.tenant_id = json.data.tenant_id || "sprint2-seed-tenant";
        }
        await route.fulfill({
          status: response.status(),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(json),
        });
      } catch {
        // Test teardown may cancel in-flight session refresh.
      }
    });

    await page.evaluate(() => {
      const raw = localStorage.getItem("egi_media_ai_session");
      if (!raw) throw new Error("missing session");
      const parsed = JSON.parse(raw);
      parsed.tenantId = parsed.tenantId || "sprint2-seed-tenant";
      parsed.activeCompanyId = "sprint2-seed-company";
      localStorage.setItem("egi_media_ai_session", JSON.stringify(parsed));
    });

    await page.goto("/id/settings/company-context/draft");
    await page.waitForLoadState("networkidle");

    // Gate must not mount when hasCompany is true
    await expect(page.getByTestId("prerequisite-gate")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Build Company Context/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("context-draft-generate")).toBeVisible();
    // Without a file selected, Generate stays disabled (company present is not enough alone for PDF)
    await expect(page.getByTestId("context-draft-generate")).toBeDisabled();

    await page.goto("/id/settings/alert-preferences");
    await expect(page.getByTestId("prerequisite-gate")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /^Alert preferences$/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("alert-preferences-save")).toBeVisible();
    await expect(page.getByText("Unavailable")).toHaveCount(0);

    await page.goto("/id/settings");
    await expect(page.getByRole("heading", { name: /^Settings$/i })).toBeVisible({ timeout: 15_000 });
    // Company-scoped cards become real SoftNav Open links when company is present
    for (const card of COMPANY_CARDS) {
      await expect(page.getByTestId(card.testId)).toHaveCount(0);
      const openCard = page.locator(".settings-hub-grid > a").filter({ has: page.getByText(card.title, { exact: true }) });
      await expect(openCard).toBeVisible();
      await expect(openCard.getByText("Open →")).toBeVisible();
    }

    await page.unrouteAll({ behavior: "ignoreErrors" });
  });
});
