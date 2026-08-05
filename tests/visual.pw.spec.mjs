import { test, expect } from "@playwright/test";

test.describe("visual regression surfaces", () => {
  test.beforeEach(async ({ page }) => {
    await page.addStyleTag({ content: "[data-next-badge-root], nextjs-portal { display: none !important; }" });
    const permissions = ["dashboard.read", "issue.read", "issue.save", "company_context.read", "alert.read", "alert.preference.manage", "company.language.manage", "report.read"];
    await page.addInitScript((sessionPermissions) => localStorage.setItem("egi_media_ai_session", JSON.stringify({ authenticated: true, accessToken: "visual-token", actor: { id: "dummy-actor", email: "executive@example.com", fullName: "Executive User", role: "executive", actorType: "human" }, permissions: sessionPermissions, tenantId: "dummy-tenant", activeCompanyId: "company-a", authorizedCompanies: [{ company_id: "company-a", tenant_id: "dummy-tenant", name: "Company A" }] })), permissions);
    await page.route("**/api/v1/auth/session", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { actor: { id: "dummy-actor", email: "executive@example.com", type: "human", role: "executive", membership_id: "membership-1" }, tenant_id: "dummy-tenant", company_id: "company-a", role: "executive", permissions, authorized_companies: [{ company_id: "company-a", tenant_id: "dummy-tenant", name: "Company A" }] }, meta: { request_id: "visual" } }) }));
    await page.route("**/api/v1/companies", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [{ company_id: "company-a", tenant_id: "dummy-tenant", name: "Company A" }] }, meta: { request_id: "visual" } }) }));
    await page.route("**/api/v1/dashboard/executive-summary**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { period: "24jam", startAt: "2026-01-01T00:00:00Z", endAt: "2026-01-02T00:00:00Z", items: [], issues: [], top5_limit: 5 }, meta: { request_id: "visual" } }) }));
    await page.route("**/api/v1/inbox/emails**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [], meta: { page: 1, limit: 50, total: 0 } }, meta: { request_id: "visual" } }) }));
    await page.route("**/api/v1/reports**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [], meta: { page: 1, limit: 50, total: 0 } }, meta: { request_id: "visual" } }) }));
    await page.route("**/api/v1/saved/issues**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [], meta: { page: 1, limit: 100, total: 0 } }, meta: { request_id: "visual" } }) }));
    await page.route("**/api/v1/companies/**/context", async (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "PROVIDER_UNAVAILABLE", message: "Temporarily unavailable" }, meta: { request_id: "visual" } }) }));
  });

  for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "tablet", width: 900, height: 1100 }, { name: "mobile", width: 390, height: 844 }]) {
    test(`dashboard ${viewport.name}`, async ({ page }) => { await page.setViewportSize({ width: viewport.width, height: viewport.height }); await page.goto("/id"); await expect(page.getByRole("heading", { name: /Company Context status unavailable/i })).toBeVisible(); await expect(page).toHaveScreenshot(`dashboard-${viewport.name}.png`, { fullPage: true }); });
  }

  test("settings surface", async ({ page }) => { await page.goto("/id/settings"); await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible(); await expect(page).toHaveScreenshot("settings-desktop.png", { fullPage: true }); });
  test("alerts empty state", async ({ page }) => { await page.goto("/id/alerts"); await expect(page.getByText("No urgent alerts yet")).toBeVisible(); await expect(page).toHaveScreenshot("alerts-unavailable.png", { fullPage: true }); });
  test("reports empty state", async ({ page }) => { await page.goto("/id/reports"); await expect(page.getByText("No reports yet")).toBeVisible(); await expect(page).toHaveScreenshot("reports-unavailable.png", { fullPage: true }); });

  test("reports populated reader audit", async ({ page }) => {
    const report = { report_id: "report-visual", report_type: "mingguan", period_start: "2026-01-01T00:00:00Z", period_end: "2026-01-08T00:00:00Z", timezone: "Asia/Jakarta", context_version: 2, metrics: { values: { issue_count: 3 } }, selected_issue_pack: [{ report_item_id: "item-1", title: "Regulatory change", priority: "tinggi" }], review_status: "draft", version: 1, created_at: "2026-01-08T00:00:00Z", updated_at: "2026-01-08T00:00:00Z" };
    await page.route("**/api/v1/reports**", async (route) => {
      if (route.request().url().endsWith("/reports/report-visual")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { report, narrative: { report_narrative_id: "narrative-1", review_status: "draft", version: 1, narrative: { executive_summary: "Pasar dan regulasi bergerak pada periode ini.", issue_narratives: [{ report_item_id: "item-1", narrative: "Regulator mengumumkan perubahan yang perlu dipantau.", source_claim_ids: ["claim-1"] }], impact_narrative: { narrative: "Perubahan dapat memengaruhi perencanaan perusahaan.", source_claim_ids: ["claim-1"] }, watch_items: [{ narrative: "Pantau aturan final dan tanggal implementasi.", source_claim_ids: ["claim-1"] }], source_references: [{ claim_id: "claim-1", source_article_id: "article-1" }] } }, activity: [] }, meta: { request_id: "visual" } }) });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [report], meta: { page: 1, limit: 20, total: 1 } }, meta: { request_id: "visual" } }) });
    });
    await page.goto("/id/reports");
    await expect(page.getByText("01 Jan 2026 → 08 Jan 2026")).toBeVisible();
    await page.getByRole("button", { name: /Open report/i }).click();
    await expect(page.getByRole("heading", { name: "Executive summary" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Main developments" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Download PDF/i })).toBeVisible();
    await page.screenshot({ path: "test-results/reports-populated-reader.png", fullPage: true });
  });

  test("report reader renders the daily, weekly, and monthly structures", async ({ page }) => {
    const cases = [
      { type: "harian", heading: "Most important issues today", extra: null },
      { type: "mingguan", heading: "Main developments", extra: "Trends and developments" },
      { type: "bulanan", heading: "Developments by category", extra: "Monthly strategic trends" },
    ];
    for (const [index, item] of cases.entries()) {
      const report = { report_id: `report-${item.type}`, report_type: item.type, period_start: "2026-01-01T00:00:00Z", period_end: "2026-01-08T00:00:00Z", timezone: "Asia/Jakarta", context_version: 2, metrics: { values: { issue_count: 1 } }, selected_issue_pack: [{ report_item_id: `item-${item.type}`, title: `Issue ${item.type}`, priority: "tinggi", status: "berkembang" }], review_status: "draft", version: 1, created_at: "2026-01-08T00:00:00Z", updated_at: "2026-01-08T00:00:00Z" };
      await page.route("**/api/v1/reports**", async (route) => {
        if (route.request().url().endsWith(`/reports/${report.report_id}`)) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { report, narrative: { report_narrative_id: `narrative-${item.type}`, review_status: "draft", version: 1, narrative: { report_type: item.type, executive_summary: ["Perubahan penting terverifikasi.", "Dampak perlu dipantau.", "Tidak ada metrik tambahan yang tersedia."], overview: [{ text: "Ringkasan periode.", source_claim_ids: ["claim-1"] }], issue_sections: [{ report_item_id: `item-${item.type}`, issue_id: `issue-${item.type}`, group: item.type === "harian" ? "important_today" : "developing", title: `Issue ${item.type}`, priority: "tinggi", status: "berkembang", what_happened: ["Peristiwa terverifikasi."], why_important: ["Relevan bagi perusahaan."], impact: ["Dampak potensial."], risk: ["Risiko perlu dipantau."], watch: ["Pantau perkembangan."], source_claim_ids: ["claim-1"] }], category_developments: item.type === "bulanan" ? [{ category: "Pasar", title: "Perkembangan pasar", points: ["Perubahan terverifikasi."], impact: ["Dampak perlu dipantau."], source_claim_ids: ["claim-1"] }] : [], comparison: { label: "Perbandingan periode sebelumnya", new_items: [], worsened: [], improved: [], priority_shifts: [], source_claim_ids: [] }, trends: item.type === "harian" ? [] : [{ text: "Belum ada tren tambahan yang terverifikasi.", source_claim_ids: ["claim-1"] }], company_impacts: [{ category: "Operasional", points: ["Dampak operasional perlu dipantau."], source_claim_ids: ["claim-1"] }], risk_opportunity: [{ kind: "risk", title: "Risiko pemantauan", text: "Perkembangan perlu dipantau.", source_claim_ids: ["claim-1"] }], watch_items: [{ text: "Pantau tindak lanjut.", source_claim_ids: ["claim-1"] }], follow_up_options: [{ text: "Tinjau kembali pada siklus berikutnya.", source_claim_ids: ["claim-1"] }], source_references: [{ claim_id: "claim-1", source_article_id: "article-1" }] } }, activity: [] }, meta: { request_id: "visual" } }) });
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [report], meta: { page: 1, limit: 20, total: 1 } }, meta: { request_id: "visual" } }) });
      });
      await page.goto("/id/reports");
      await page.getByRole("button", { name: /Open report/i }).click();
      await expect(page.getByRole("heading", { name: item.heading })).toBeVisible();
      if (item.extra) await expect(page.getByRole("heading", { name: item.extra })).toBeVisible();
      await page.screenshot({ path: `test-results/reports-${item.type}-reader.png`, fullPage: true });
      await page.getByRole("heading", { name: item.heading }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/reports-${item.type}-reader-content.png`, fullPage: true });
      await page.getByRole("dialog", { name: "Report detail" }).getByRole("button", { name: "Close report detail" }).click();
      if (index < cases.length - 1) await page.waitForTimeout(100);
    }
  });

  test("populated Executive Summary follows the Mockup hierarchy", async ({ page }) => {
    await page.route("**/api/v1/companies/**/context", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { context_id: "context-visual", company_id: "company-a", version: 2, status: "effective" }, meta: { request_id: "visual" } }),
    }));
    await page.route("**/api/v1/dashboard/executive-summary**", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          period: "24jam",
          startAt: "2026-01-01T00:00:00Z",
          endAt: "2026-01-02T00:00:00Z",
          items: [
            { issueId: "issue-1", title: "Strategic market signal", oneLiner: "A validated change that may affect the company plan.", status: "berkembang", priority: "tinggi", lastDevelopedAt: "2026-01-02T00:00:00Z" },
            { issueId: "issue-2", title: "Regulatory direction", oneLiner: "A policy development worth watching before the next decision cycle.", status: "baru", priority: "sedang", lastDevelopedAt: "2026-01-01T21:00:00Z" },
            { issueId: "issue-3", title: "Operational dependency", oneLiner: "A supplier-side development with a company-relevant dependency.", status: "dipantau", priority: "rendah", lastDevelopedAt: "2026-01-01T18:00:00Z" },
            { issueId: "issue-4", title: "Competitive movement", oneLiner: "A verified market movement with limited current exposure.", status: "baru", priority: null, lastDevelopedAt: "2026-01-01T12:00:00Z" },
          ],
          issues: [],
          top5_limit: 5,
        },
        meta: { request_id: "visual" },
      }),
    }));
    await page.goto("/id");
    await expect(page.getByRole("heading", { name: "Strategic market signal" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Open issue: Competitive movement/ })).toBeVisible();
    await expect(page.getByText("High", { exact: true })).toBeVisible();
    await expect(page.getByText("Developing", { exact: true })).toBeVisible();
    await expect(page).toHaveScreenshot("dashboard-populated-desktop.png", { fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("button", { name: /Open issue: Strategic market signal/ })).toBeVisible();
    await expect(page).toHaveScreenshot("dashboard-populated-mobile.png", { fullPage: true });
  });

  test("loading and error state primitives", async ({ page }) => { await page.goto("/id/settings/company-context"); await expect(page.getByRole("heading", { name: "Company Context", exact: true })).toBeVisible(); await expect(page).toHaveScreenshot("company-context-state.png", { fullPage: true }); });

  test("issue detail drawer", async ({ page }) => {
    const validatedAnalysis = { status: "current", analysisId: "analysis-visual", contextVersion: 2, validatedAt: "2026-01-02T00:00:00Z", gate: { passed: true }, evidence: [{ sourceArticleId: "article-visual", canonicalUrl: "https://example.com/visual-article", locale: "id-ID", updatedAt: "2026-01-02T00:00:00Z" }], analysis: { what_happened: ["A regulatory change was announced for the market."], why_matters: ["The change may affect the company's strategic planning window."], impacts: [{ text: "Planning assumptions may need to be revisited.", source_article_ids: ["article-visual"] }], risks: [{ text: "A delayed response could increase execution pressure.", source_article_ids: ["article-visual"] }], watch: [{ text: "Monitor the final guidance and implementation date.", source_article_ids: ["article-visual"] }], claims: [{ claim_id: "claim-visual", text: "The announcement changes the planning window.", source_article_ids: ["article-visual"] }] } };
    await page.route("**/api/v1/issues/issue-visual", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { issue_id: "issue-visual", title: "Visual issue detail", one_liner: "A validated issue detail for visual review", status: "berkembang", version: 1, first_seen_at: "2026-01-01T00:00:00Z", last_developed_at: "2026-01-02T00:00:00Z", articles: [], developments: [], analysis: validatedAnalysis, priority: { priority: "tinggi", analysisId: "analysis-visual", contextVersion: 2, effectiveAt: "2026-01-02T00:00:00Z" } }, meta: { request_id: "visual" } }) }));
    await page.route("**/api/v1/dashboard/executive-summary**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { period: "24jam", startAt: "2026-01-01T00:00:00Z", endAt: "2026-01-02T00:00:00Z", items: [{ issueId: "issue-visual", title: "Visual issue detail", oneLiner: "A validated issue detail for visual review", status: "berkembang", priority: "tinggi", lastDevelopedAt: "2026-01-02T00:00:00Z" }], issues: [], top5_limit: 5 }, meta: { request_id: "visual" } }) }));
    await page.goto("/id");
    await page.getByRole("button", { name: /Visual issue detail/i }).click();
    await expect(page.getByRole("dialog", { name: "Issue detail" })).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Visual issue detail" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What happened" })).toBeVisible();
    await expect(page.getByText("Cited points are linked to the evidence trail below.")).toBeVisible();
    await expect(page).toHaveScreenshot("issue-drawer-desktop.png", { fullPage: true });
  });

  test("issue detail drawer loading state remains actionable", async ({ page }) => {
    await page.route("**/api/v1/dashboard/executive-summary**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { period: "24jam", startAt: "2026-01-01T00:00:00Z", endAt: "2026-01-02T00:00:00Z", items: [{ issueId: "issue-loading", title: "Loading issue", oneLiner: "Issue detail is being retrieved", status: "berkembang", priority: "tinggi", lastDevelopedAt: "2026-01-02T00:00:00Z" }], issues: [], top5_limit: 5 }, meta: { request_id: "visual" } }) }));
    await page.route("**/api/v1/issues/issue-loading", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { issue_id: "issue-loading", title: "Loading issue", one_liner: "Issue detail is being retrieved", status: "berkembang", version: 1, first_seen_at: "2026-01-01T00:00:00Z", last_developed_at: "2026-01-02T00:00:00Z", articles: [], developments: [], analysis: null, priority: null }, meta: { request_id: "visual" } }) });
    });
    await page.goto("/id");
    await page.getByRole("button", { name: /Loading issue/i }).click();
    const dialog = page.getByRole("dialog", { name: "Issue detail" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-busy", "true");
    await expect(dialog.getByRole("button", { name: "Close issue detail" })).toBeVisible();
    await expect(page).toHaveScreenshot("issue-drawer-loading-desktop.png", { fullPage: true });
    await dialog.getByRole("button", { name: "Close issue detail" }).click();
    await expect(dialog).toHaveCount(0);
  });
});
