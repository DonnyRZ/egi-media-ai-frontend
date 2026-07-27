import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("frontend endpoint registry stays within the implemented read/write contract", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src/shared/constants/api.constants.ts"), "utf8");
  for (const endpoint of ["executiveSummary", "newsFeed", "issues", "issueById", "articleSource", "issueComplete", "companyContext", "companyContextDraft", "companies", "savedIssues", "issueSaved", "inboxEmails", "inboxEmailRead", "alertPreference", "alertPreferenceRead", "languagePreference", "languagePreferenceRead", "newsIntakeStatus", "newsIntakeAutomatic", "newsIntakePull", "newsIntakeRuns", "reports", "reportById", "reportReview", "reportApprove", "reportShare"]) assert.match(source, new RegExp(`\\b${endpoint}\\b`));
});

test("news feed channel registry matches locked F0 order (19 tabs)", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src/shared/news-feed-channels.ts"), "utf8");
  const order = [
    "viral",
    "egi_media",
    "detik",
    "viva",
    "suara",
    "cnn_indonesia",
    "liputan6",
    "tirto",
    "tempo",
    "kumparan",
    "jawa_pos",
    "okezone",
    "sindonews",
    "idn_times",
    "republika",
    "media_indonesia",
    "merdeka",
    "beritasatu",
    "tribunnews",
  ];
  assert.match(source, /DEFAULT_NEWS_FEED_CHANNEL:\s*NewsFeedChannelId\s*=\s*"egi_media"/);
  assert.match(source, /EXTERNAL_INTAKE_MEDIA/);
  let lastIndex = -1;
  for (const id of order) {
    const index = source.indexOf(`id: "${id}"`);
    assert.ok(index > lastIndex, `channel ${id} missing or out of order`);
    lastIndex = index;
  }
  assert.equal(order.length, 19);
});

test("external intake media excludes viral and egi_media (17 outlets)", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src/shared/news-feed-channels.ts"), "utf8");
  assert.match(source, /channel\.id !== "viral" && channel\.id !== "egi_media"/);
});
