import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadBackendEnv() {
  const out = {};
  const raw = readFileSync(resolve(__dirname, "../../egi-media-ai-backend/.env"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

async function assertNoUnauthorizedFlash(page, durationMs = 2500, stepMs = 200) {
  const end = Date.now() + durationMs;
  while (Date.now() < end) {
    await expect(page.locator(".standard-state-unauthorized")).toHaveCount(0);
    const body = await page.locator("body").innerText().catch(() => "");
    expect(body.toLowerCase()).not.toContain("sign in required");
    expect(body.toLowerCase()).not.toContain("session is not available yet");
    await page.waitForTimeout(stepMs);
  }
}

async function loginAsBootstrap(page) {
  const env = loadBackendEnv();
  const email = env.BOOTSTRAP_ADMIN_EMAIL;
  const password = env.BOOTSTRAP_ADMIN_PASSWORD;
  expect(email).toBeTruthy();
  expect(password).toBeTruthy();

  await page.goto("/id/login");
  await page.locator("#email").waitFor();
  await page.waitForTimeout(800);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);

  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/v1/auth/login") && res.ok()),
    page.locator("button.login-submit").click(),
  ]);

  await page.waitForURL((url) => Boolean(url.pathname) && !url.pathname.includes("/login"), { timeout: 60_000 });
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 120_000 });
}

test.describe("live auth login", () => {
  test("successful login leaves /login and opens the shell", async ({ page }) => {
    test.setTimeout(240_000);
    await loginAsBootstrap(page);
    const token = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem("egi_media_ai_session") || "null")?.accessToken;
      } catch {
        return null;
      }
    });
    expect(token).toBeTruthy();
  });

  test("login never paints the unauthorized interstitial", async ({ page }) => {
    test.setTimeout(240_000);
    const env = loadBackendEnv();
    await page.goto("/id/login");
    await page.locator("#email").waitFor();
    await page.waitForTimeout(800);
    await page.locator("#email").fill(env.BOOTSTRAP_ADMIN_EMAIL);
    await page.locator("#password").fill(env.BOOTSTRAP_ADMIN_PASSWORD);

    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/v1/auth/login") && res.ok()),
      page.locator("button.login-submit").click(),
    ]);

    await assertNoUnauthorizedFlash(page, 4000, 200);
    await page.waitForURL((url) => Boolean(url.pathname) && !url.pathname.includes("/login"), { timeout: 60_000 });
    await expect(page.locator(".app-shell")).toBeVisible({ timeout: 120_000 });
    await expect(page.locator(".standard-state-unauthorized")).toHaveCount(0);
  });

  test("sign out lands on login without the unauthorized interstitial", async ({ page }) => {
    test.setTimeout(240_000);
    await loginAsBootstrap(page);

    await page.locator(".profile-button").click();
    await page.getByRole("button", { name: /Sign out/i }).click();

    await assertNoUnauthorizedFlash(page, 4000, 200);
    await page.waitForURL(/\/login/, { timeout: 60_000 });
    await expect(page.locator("#email")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".standard-state-unauthorized")).toHaveCount(0);

    const session = await page.evaluate(() => localStorage.getItem("egi_media_ai_session"));
    expect(session).toBeNull();
  });

  test("invalid password shows an error and stays on login", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/id/login");
    await page.locator("#email").waitFor();
    await page.waitForTimeout(800);
    await page.locator("#email").fill("donny.landscape@gmail.com");
    await page.locator("#password").fill("DefinitelyWrongPassword!!!");

    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/v1/auth/login") && res.status() === 401),
      page.locator("button.login-submit").click(),
    ]);

    await expect(page.locator(".login-error")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
