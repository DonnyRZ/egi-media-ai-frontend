import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.pw.spec.mjs",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  // A single Next dev server is shared by the browser suite; serial execution
  // prevents HMR/compile races from contaminating functional and screenshot gates.
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3001", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "npm.cmd run dev -- --hostname 127.0.0.1 --port 3001", url: "http://127.0.0.1:3001/id/login", reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
