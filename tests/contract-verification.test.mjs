import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("frontend endpoint registry stays within the implemented read/write contract", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src/shared/constants/api.constants.ts"), "utf8");
  for (const endpoint of ["executiveSummary", "issues", "issueById", "articleSource", "issueComplete", "companyContext", "companyContextDraft", "companies", "savedIssues", "issueSaved", "inboxEmails", "inboxEmailRead", "alertPreference", "alertPreferenceRead", "languagePreference", "languagePreferenceRead", "reports", "reportById", "reportReview", "reportApprove", "reportShare"]) assert.match(source, new RegExp(`\\b${endpoint}\\b`));
});
