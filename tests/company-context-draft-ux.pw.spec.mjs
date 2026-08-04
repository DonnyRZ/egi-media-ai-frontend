import { test, expect } from "@playwright/test";

const COMPANY = { company_id: "company-a", tenant_id: "tenant-a", name: "Company A", status: "active" };
const ANALYST_PERMISSIONS = [
  "dashboard.read",
  "issue.read",
  "company_context.read",
  "company_context.draft",
  "company_context.review",
  "report.read",
  "alert.read",
];

function envelope(data, meta = {}) {
  return { success: true, data, meta: { request_id: "company-context-draft-ux", ...meta } };
}

async function seedDraftSession(page, permissions = ANALYST_PERMISSIONS, role = "analyst") {
  const session = {
    authenticated: true,
    accessToken: "company-context-draft-ux-token",
    actor: {
      id: "user:analyst@example.com",
      email: "analyst@example.com",
      fullName: "Analyst User",
      role,
      actorType: "human",
    },
    permissions,
    tenantId: "tenant-a",
    activeCompanyId: "company-a",
    authorizedCompanies: [COMPANY],
  };
  const sessionData = {
    actor: { id: session.actor.id, email: session.actor.email, type: "human", role, membership_id: `membership-${role}` },
    tenant_id: "tenant-a",
    company_id: "company-a",
    role,
    permissions,
    authorized_companies: [COMPANY],
  };

  await page.addInitScript((value) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("egi_media_ai_session", JSON.stringify(value));
  }, session);

  // Keep non-essential shell calls deterministic while each test asserts the
  // specific draft endpoint contract below.
  await page.route("**/api/v1/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(envelope({ items: [], meta: { total: 0 } })),
    });
  });
  await page.route("**/api/v1/auth/session", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(envelope(sessionData)) }));
  await page.route("**/api/v1/companies", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(envelope({ items: [COMPANY] })) }));
  await page.route("**/api/v1/companies/company-a/language-preference", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(envelope({ language: "en" })) }));
}

function incompleteDraft() {
  return {
    draft_id: "draft-incomplete",
    company_id: "company-a",
    status: "draft",
    is_effective: false,
    revision: 1,
    result: {
      status: "insufficient_data",
      context: {
        name: "Company A",
        industry: "Technology",
        description: "",
        products: ["Enterprise platform"],
        customers: [],
        regions: [],
        priorities: [],
        sub_industry: null,
        competitors: [],
        goals: [],
        risks: ["Potential regulatory exposure"],
        topics: [],
        dependencies: [],
      },
      field_review: {
        name: "ai_proposed",
        industry: "ai_proposed",
        description: "missing",
        products: "ai_proposed",
        customers: "missing",
        regions: "missing",
        priorities: "missing",
        sub_industry: "reviewed_none_disclosed",
        competitors: "reviewed_none_disclosed",
        goals: "reviewed_none_disclosed",
        risks: "ai_proposed",
        topics: "reviewed_none_disclosed",
        dependencies: "reviewed_none_disclosed",
      },
    },
    review: { submitted_by: null, submitted_at: null, approved_by: null, approved_at: null, note: null },
    created_at: "2026-08-03T00:00:00Z",
    updated_at: "2026-08-03T00:00:00Z",
  };
}

test.describe("Company Context draft UX gate", () => {
  test("starts with a clear source-selection state and surfaces backend validation", async ({ page }) => {
    await seedDraftSession(page);
    await page.route("**/api/v1/company-context/draft", async (route) => {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: { code: "SOURCE_INVALID", message: "Enter a valid company profile URL." } }),
      });
    });

    await page.goto("/id/settings/company-context/draft");
    await expect(page.getByRole("heading", { name: "Build Company Context" })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Company profile source" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Company PDF" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "company-profile-tab-pdf");
    await expect(page.getByTestId("context-draft-generate")).toBeDisabled();
    await expect(page).toHaveScreenshot("company-context-draft-initial.png", { fullPage: true });

    await page.getByRole("tab", { name: "Company PDF" }).press("ArrowRight");
    await expect(page.getByRole("tab", { name: "URL" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "company-profile-tab-url");
    await page.getByLabel("Company profile URL").fill("not-a-url");
    await expect(page.getByTestId("context-draft-generate")).toBeEnabled();
    await page.getByTestId("context-draft-generate").click();
    await expect(page.getByRole("alert").filter({ hasText: "Enter a valid company profile URL." })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveScreenshot("company-context-draft-validation-error.png", { fullPage: true });
  });

  test("shows generation loading, makes incomplete facts explicit, and saves a draft without activating it", async ({ page }) => {
    await seedDraftSession(page);
    let draft = incompleteDraft();
    const fulfillDraft = async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      await new Promise((resolve) => setTimeout(resolve, 4500));
      await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify(envelope({ draft })) });
    };
    await page.route("**/api/v1/company-context/draft", fulfillDraft);
    await page.route("**/api/v1/company-context/draft/pdf", fulfillDraft);
    await page.route("**/api/v1/company-context/drafts/draft-incomplete", async (route) => {
      if (route.request().method() !== "PATCH") return route.fallback();
      await new Promise((resolve) => setTimeout(resolve, 1200));
      draft = { ...draft, revision: draft.revision + 1 };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(envelope(draft)) });
    });

    await page.goto("/id/settings/company-context/draft");
    await page.getByLabel("Company profile PDF").setInputFiles({ name: "company-profile.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7") });
    await page.getByTestId("context-draft-generate").click();
    await expect(page.getByTestId("context-draft-generate")).toHaveText("Building draft...");
    await expect(page.getByTestId("context-draft-generate")).toBeDisabled();
    await expect(page.getByTestId("context-generation-state")).toBeVisible();
    await expect(page.getByText("Building a reviewable draft")).toBeVisible();
    await expect(page.getByText("Analyzing the selected source...")).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveScreenshot("company-context-draft-loading.png", { fullPage: true });

    await expect(page.getByText("Review generated fields")).toBeVisible();
    await expect(page.getByTestId("context-completeness")).toContainText("Description");
    await expect(page.getByTestId("context-completeness")).toContainText("Customers");
    await expect(page.getByRole("button", { name: "Confirm AI proposal" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark not disclosed" }).first()).toBeVisible();
    await expect(page.getByTestId("context-draft-save")).toHaveText("Save draft");
    await expect(page).toHaveScreenshot("company-context-draft-incomplete.png", { fullPage: true });

    await page.getByRole("button", { name: "Confirm AI proposal" }).first().click();
    await page.getByRole("button", { name: "Mark not disclosed" }).first().click();
    await page.getByTestId("context-draft-save").click();
    await expect(page.getByTestId("context-draft-save")).toHaveText("Saving...");
    await expect(page.getByTestId("context-draft-save")).toBeDisabled();
    await expect(page.getByText("Saving the draft...")).toBeVisible();
    await expect(page.locator(".context-flow-notice.success")).toContainText("Draft saved. Add the missing core company facts");
    await expect(page.getByText("active", { exact: true })).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveScreenshot("company-context-draft-saved-incomplete.png", { fullPage: true });
  });

  test("keeps an approved draft read-only and reports provider failure without placeholder copy", async ({ page }) => {
    await seedDraftSession(page);
    const approved = { ...incompleteDraft(), status: "approved", is_effective: true, result: { ...incompleteDraft().result, status: "complete" } };
    let attempts = 0;
    await page.route("**/api/v1/companies/company-a/context", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(envelope({ version: 2, updated_at: "2026-08-03T10:00:00Z", management_identity: { status: "ready" } })),
    }));
    const fulfillAttempt = async (route) => {
      attempts += 1;
      if (attempts === 1) {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "AI_PROVIDER_UNAVAILABLE", message: "The profile source could not be processed right now." } }) });
        return;
      }
      await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify(envelope({ draft: approved })) });
    };
    await page.route("**/api/v1/company-context/draft", fulfillAttempt);
    await page.route("**/api/v1/company-context/draft/pdf", fulfillAttempt);

    await page.goto("/id/settings/company-context/draft");
    await page.getByLabel("Company profile PDF").setInputFiles({ name: "company-profile.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7") });
    await page.getByTestId("context-draft-generate").click();
    await expect(page.getByRole("alert").filter({ hasText: "The profile source could not be processed right now." })).toBeVisible();
    await expect(page.getByText(/Coming soon/i)).toHaveCount(0);

    // A subsequent successful generation can return an already-approved draft;
    // review controls must not remain actionable after activation.
    await page.getByTestId("context-draft-generate").click();
    await expect(page.getByTestId("context-approved-state")).toBeVisible();
    await expect(page.getByTestId("context-completeness")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Confirm AI proposal" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Mark not disclosed" })).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveScreenshot("company-context-draft-approved-readonly.png", { fullPage: true });
  });

  test("shows identity retry progress when the active context is waiting for readiness", async ({ page }) => {
    await seedDraftSession(page, [...ANALYST_PERMISSIONS, "company_context.approve"], "company_admin");
    const approved = { ...incompleteDraft(), status: "approved", is_effective: true, result: { ...incompleteDraft().result, status: "complete" } };

    await page.route("**/api/v1/companies/company-a/context", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(envelope({ version: 2, updated_at: "2026-08-03T10:00:00Z", management_identity: { status: "failed", error_message: "Identity generation needs another attempt." } })),
    }));
    await page.route("**/api/v1/company-context/draft/pdf", async (route) => route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify(envelope({ draft: approved })),
    }));
    await page.route("**/api/v1/companies/company-a/context/management-identity/retry", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 7000));
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify(envelope({ management_identity: { status: "ready" } })),
      });
    });

    await page.goto("/id/settings/company-context/draft");
    await page.getByLabel("Company profile PDF").setInputFiles({ name: "company-profile.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7") });
    await page.getByTestId("context-draft-generate").click();
    await expect(page.getByTestId("context-approved-state")).toBeVisible();
    const retryButton = page.getByTestId("context-draft-retry-identity");
    await expect(retryButton).toBeVisible();
    await retryButton.click();
    await expect(retryButton).toHaveText("Retrying...");
    await expect(retryButton).toBeDisabled();
    await expect(page.getByText("Retrying management identity...")).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveScreenshot("company-context-draft-identity-retry-loading.png", { fullPage: true });
    await expect(page.getByTestId("context-draft-identity-status")).toContainText("Management identity: ready", { timeout: 10_000 });
  });
});
