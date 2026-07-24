import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("frontend environment contract is documented without secrets", () => {
  const root = process.cwd();
  const example = fs.readFileSync(path.join(root, ".env.example"), "utf8");
  for (const key of ["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_DEFAULT_LOCALE"]) assert.match(example, new RegExp(`^${key}=`, "m"));
  assert.doesNotMatch(example, /OPENAI_API_KEY|GMAIL_APP_PASSWORD|Authorization:\s*Bearer\s+[^$\n]+/i);
});
