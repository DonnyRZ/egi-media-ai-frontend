import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

const { mapIssueList, mapCompanyContext } = await import("../src/shared/api-mappers.ts");
const { buildIssueListParams } = await import("../src/shared/api-query.ts");

let server;
let baseUrl;
let idempotencyExecutions;
let idempotencyResults;

before(async () => {
  idempotencyExecutions = 0;
  idempotencyResults = new Map();
  server = http.createServer((request, response) => {
    const send = (status, payload) => { response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify(payload)); };
    const requestUrl = new URL(request.url, "http://localhost");
    if (requestUrl.pathname === "/issues" && request.method === "GET") {
      if (!request.headers.authorization) return send(401, errorEnvelope("UNAUTHORIZED", "Authentication required"));
      if (request.headers["x-company-id"] === "wrong-company") return send(403, errorEnvelope("FORBIDDEN", "Company scope is not authorized"));
      return send(200, { success: true, data: { items: [], meta: { page: Number(requestUrl.searchParams.get("page") || 1), limit: 10, total: 0 } }, meta: { request_id: "test-request", correlation_id: "test-correlation" } });
    }
    if (requestUrl.pathname === "/versioned" && request.method === "POST") {
      if (request.headers["if-match"] !== "3") return send(409, errorEnvelope("VERSION_CONFLICT", "Version is stale"));
      return send(200, { success: true, data: { version: 4 }, meta: { request_id: "test-request" } });
    }
    if (requestUrl.pathname === "/idempotent" && request.method === "POST") {
      const key = request.headers["idempotency-key"];
      if (!key) return send(400, errorEnvelope("VALIDATION_ERROR", "Idempotency-Key is required"));
      if (idempotencyResults.has(key)) return send(200, { success: true, data: idempotencyResults.get(key), meta: { request_id: "test-request" } });
      idempotencyExecutions += 1;
      const result = { execution: idempotencyExecutions };
      idempotencyResults.set(key, result);
      return send(200, { success: true, data: result, meta: { request_id: "test-request" } });
    }
    return send(404, errorEnvelope("NOT_FOUND", "Not found"));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

describe("API mapper contract", () => {
  it("maps issue list DTO without changing backend pagination", () => {
    const result = mapIssueList({ items: [{ issue_id: "i-1", title: "Signal", one_liner: "One liner", status: "baru", priority: "tinggi", first_seen_at: "2026-01-01T00:00:00Z", last_developed_at: null, version: 1 }], meta: { page: 2, limit: 10, total: 21 } });
    assert.equal(result.items[0].id, "i-1");
    assert.deepEqual(result.pagination, { page: 2, limit: 10, total: 21 });
  });

  it("maps effective context fields without inventing data", () => {
    const result = mapCompanyContext({ context_id: "ctx-1", company_id: "co-1", version: 2, status: "effective", source: "ai_draft", draft_id: "draft-1", fields: { company_name: "Example" }, change_reason: null, updated_by: "actor-1", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" });
    assert.equal(result.companyId, "co-1");
    assert.equal(result.fields.industry, undefined);
  });
});

describe("query params and pagination contract", () => {
  it("omits all filters and normalizes page defaults", () => {
    assert.deepEqual(buildIssueListParams({ q: "  ", priority: "all", status: "all", page: 0, limit: 200 }), { q: undefined, priority: undefined, status: undefined, page: 1, limit: 100 });
  });

  it("preserves search/filter/page values", () => {
    assert.deepEqual(buildIssueListParams({ q: "  signal ", priority: "tinggi", status: "berkembang", page: 3, limit: 10 }), { q: "signal", priority: "tinggi", status: "berkembang", page: 3, limit: 10 });
  });
});

describe("HTTP envelope and security behavior", () => {
  it("returns the documented error envelope for auth failure", async () => {
    const response = await fetch(`${baseUrl}/issues`);
    const body = await response.json();
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "UNAUTHORIZED");
  });

  it("rejects an untrusted company scope", async () => {
    const response = await fetch(`${baseUrl}/issues`, { headers: { Authorization: "Bearer test", "X-Company-Id": "wrong-company" } });
    const body = await response.json();
    assert.equal(response.status, 403);
    assert.equal(body.error.code, "FORBIDDEN");
  });

  it("preserves backend pagination response", async () => {
    const response = await fetch(`${baseUrl}/issues?page=2`, { headers: { Authorization: "Bearer test" } });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body.data.meta, { page: 2, limit: 10, total: 0 });
  });

  it("surfaces version conflict instead of retrying blindly", async () => {
    const response = await fetch(`${baseUrl}/versioned`, { method: "POST", headers: { "If-Match": "2" } });
    const body = await response.json();
    assert.equal(response.status, 409);
    assert.equal(body.error.code, "VERSION_CONFLICT");
  });

  it("requires idempotency key on state-changing request", async () => {
    const missing = await fetch(`${baseUrl}/idempotent`, { method: "POST" });
    assert.equal(missing.status, 400);
    const key = "test-idempotency-key-001";
    const first = await (await fetch(`${baseUrl}/idempotent`, { method: "POST", headers: { "Idempotency-Key": key } })).json();
    const second = await (await fetch(`${baseUrl}/idempotent`, { method: "POST", headers: { "Idempotency-Key": key } })).json();
    assert.equal(idempotencyExecutions, 1);
    assert.deepEqual(second.data, first.data);
  });
});

function errorEnvelope(code, message) { return { success: false, error: { code, message }, meta: { request_id: "test-request", correlation_id: "test-correlation", retryable: false } }; }
