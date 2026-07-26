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

test.describe("Loop A/B platform_superadmin provisioning", () => {
  test("session permissions unlock provisioning UX", async ({ page }) => {
    test.setTimeout(90_000);
    const { email, password } = bootstrapCreds();
    const capture = { login: null, session: null };

    await page.goto("/id/login");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    const networkErrors = [];
    page.on("requestfailed", (request) => {
      if (request.url().includes("/api/v1/auth/login")) {
        networkErrors.push({ url: request.url(), error: request.failure()?.errorText || "unknown" });
      }
    });
    page.on("response", async (response) => {
      const url = response.url();
      try {
        if (url.includes("/api/v1/auth/login") && response.request().method() === "POST") {
          const body = await response.json().catch(() => null);
          capture.login = { status: response.status(), url, role: body?.data?.actor?.role ?? null, tenant_id: body?.data?.tenant_id ?? null, error: body?.error || body?.message || null, bodyKeys: body ? Object.keys(body) : [] };
        }
        if (url.includes("/api/v1/auth/session") && response.request().method() === "GET") {
          const body = await response.json().catch(() => null);
          capture.session = {
            status: response.status(),
            role: body?.data?.role ?? null,
            permissions: body?.data?.permissions ?? null,
            hasManage: Array.isArray(body?.data?.permissions) && body.data.permissions.includes("platform.tenants.manage"),
          };
        }
      } catch {
        /* ignore parse races */
      }
    });

    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Continue to workspace" }).click();
    await page.waitForTimeout(3000);
    console.log("AFTER_LOGIN", JSON.stringify({ capture, networkErrors, url: page.url(), alert: await page.locator("[role=alert]").innerText().catch(() => null) }, null, 2));
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });

    await expect.poll(() => capture.login?.status, { timeout: 15_000 }).toBe(200);
    await expect.poll(() => capture.session?.status, { timeout: 15_000 }).toBe(200);

    const store = await page.evaluate(() => {
      const raw = localStorage.getItem("egi_media_ai_session");
      const parsed = raw ? JSON.parse(raw) : null;
      return {
        localPermissions: parsed?.permissions ?? null,
        localRole: parsed?.actor?.role ?? null,
        hasManageInLocal: Array.isArray(parsed?.permissions) && parsed.permissions.includes("platform.tenants.manage"),
      };
    });

    console.log("CAPTURE", JSON.stringify({ capture, store }, null, 2));

    await page.goto("/id/settings/platform");
    await page.waitForLoadState("networkidle");

    // Give AuthGate time to apply session permissions after full navigation.
    await page.waitForTimeout(1500);

    const pageText = await page.locator("main, .settings-hub, .standard-state").first().innerText().catch(() => page.locator("body").innerText());
    console.log("PLATFORM_PAGE_SNIPPET", pageText.slice(0, 500));
    console.log("STORE_AFTER_NAV", JSON.stringify(await page.evaluate(() => {
      const raw = localStorage.getItem("egi_media_ai_session");
      const parsed = raw ? JSON.parse(raw) : null;
      return { localPermissions: parsed?.permissions ?? null, localRole: parsed?.actor?.role ?? null };
    })));

    const forbidden = page.getByRole("heading", { name: /platform administration only/i });
    const provisioningTitle = page.getByRole("heading", { name: /customer provisioning/i });

    // Loop A assert
    expect(capture.session?.hasManage).toBe(true);
    await expect(forbidden).toHaveCount(0, { timeout: 15_000 });
    await expect(provisioningTitle).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("alert").filter({ hasText: /could not load tenants|tenants are unavailable/i })).toHaveCount(0);

    // Loop B: EGI Resources tenant + AGAT company
    const egiRow = page.locator(".access-row").filter({ hasText: /EGI Resources/i }).first();
    await expect(egiRow).toBeVisible({ timeout: 15_000 });
    await egiRow.getByRole("button", { name: "Select" }).click();
    await expect(page.getByText(/AGAT Laser Beam/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("alert").filter({ hasText: /could not load companies|companies are unavailable/i })).toHaveCount(0);
    await expect(page.getByLabel("Owner email")).toBeVisible();
  });
});
