import { defineConfig, devices } from "@playwright/test";

// Scope UX anti-miss matrix (Sprints 0–4): `npm run test:scope-ux`
// Requires FE :3001 + BE :5003; specs bootstrap admin from ../egi-media-ai-backend/.env

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
  use: { baseURL: "http://localhost:3001", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "npm.cmd run dev -- --hostname localhost --port 3001", url: "http://localhost:3001/id/login", reuseExistingServer: !process.env.CI, timeout: 180_000 },
});
