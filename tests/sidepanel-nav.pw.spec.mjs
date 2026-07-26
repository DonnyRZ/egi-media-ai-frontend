import { test, expect } from "@playwright/test";

const EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL || "egi.egiholding@gmail.com";
const PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD || "EgiMedia123!";

const ROUTES = [
  { label: "All Issues", path: /\/id\/issues/, heading: /All Issues|Issues/i },
  { label: "Alerts", path: /\/id\/alerts/, heading: /Alerts|Inbox|Notification/i },
  { label: "Reports", path: /\/id\/reports/, heading: /Reports|Report/i },
  { label: "Settings", path: /\/id\/settings(?!\/)/, heading: /Settings|Workspace/i },
  { label: "Executive Summary", path: /\/id\/?$/, heading: /Executive Summary/i },
];

async function realLogin(page) {
  await page.goto("/id/login");
  await page.getByLabel("Work email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /Continue to workspace/i }).click();
  await expect(page).toHaveURL(/\/id\/?$/, { timeout: 30_000 });
  await expect(page.locator(".app-sidebar")).toBeVisible({ timeout: 60_000 });
}

async function clickSidebar(page, label) {
  const link = page.locator(".app-sidebar").getByRole("link", { name: new RegExp(`^${label}`, "i") });
  await link.click();
}

test.describe("sidebar soft navigation (warm)", () => {
  test.setTimeout(240_000);

  test("warm pass: URL + content feel instant, no hard reload", async ({ page }) => {
    await realLogin(page);
    const shell = page.locator(".app-shell");
    await expect(shell).toBeVisible();

    // Warm each route once (dev compile can be slow; not scored)
    for (const route of ROUTES) {
      await clickSidebar(page, route.label);
      await expect(page).toHaveURL(route.path, { timeout: 90_000 });
      await expect(page.locator(".shell-content h1, .shell-content h2").first()).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(400);
    }

    await shell.evaluate((el) => el.setAttribute("data-nav-probe", "1"));

    const results = [];
    for (const route of ROUTES) {
      const t0 = Date.now();
      await clickSidebar(page, route.label);
      await expect(page).toHaveURL(route.path, { timeout: 3_000 });
      const urlMs = Date.now() - t0;

      const contentStart = Date.now();
      await expect(page.locator(".shell-content h1, .shell-content h2").first()).toBeVisible({ timeout: 3_000 });
      const contentMs = Date.now() - contentStart;

      const opacity = await page.locator(".shell-content").evaluate((el) => Number.parseFloat(getComputedStyle(el).opacity));
      const probe = await page.locator(".app-shell").getAttribute("data-nav-probe");
      const softNav = probe === "1";

      results.push({ label: route.label, urlMs, contentMs, opacity, softNav });
      console.log(`[warm] ${route.label}: url=${urlMs}ms content=${contentMs}ms opacity=${opacity} soft=${softNav}`);

      expect(softNav, `${route.label}: AppShell stayed mounted (soft nav)`).toBe(true);
      expect(opacity, `${route.label}: content must not fade/stuck`).toBeGreaterThanOrEqual(0.95);
      // Dev soft-nav URL timing can jitter; require no multi-second freeze (target often <300ms).
      expect(urlMs, `${route.label}: URL should update without multi-second freeze`).toBeLessThan(1200);
      expect(contentMs, `${route.label}: destination content without multi-second freeze`).toBeLessThan(800);
    }

    console.log(`[warm] summary maxUrl=${Math.max(...results.map((r) => r.urlMs))} maxContent=${Math.max(...results.map((r) => r.contentMs))}`);
  });
});
