# AI Frontend–Backend Integration Contract

Status: Sprint 01 — Contract closure  
Scope: `egi-media-ai-frontend` ↔ `egi-media-ai-backend`  
Frontend implementation status: contract only; no UI integration is authorized by this sprint.

## 1. Purpose

Dokumen ini menjadi sumber acuan integrasi frontend terhadap backend AI. Mockup dipakai sebagai referensi pengalaman pengguna, tetapi route, DTO, authorization, lifecycle, dan aturan bisnis di backend menjadi sumber kebenaran teknis.

Frontend tidak boleh membuat asumsi dari route yang hanya tercantum di Swagger. Endpoint hanya dianggap tersedia jika terdaftar pada route source backend dan benar-benar diregistrasikan oleh `src/routes/index.js`.

## 2. Source of truth

Urutan sumber kebenaran:

1. Implementasi route dan service backend.
2. Schema/migration dan error contract backend.
3. Swagger sebagai dokumentasi contract yang harus diselaraskan.
4. Mockup sebagai referensi layout dan interaction, bukan sumber API.

Audit Sprint 01 menemukan:

- 33 operasi benar-benar ada di source dan diregistrasikan backend.
- 42 operasi tercantum di `swagger_output.json`.
- Tidak ada operasi source yang hilang dari Swagger setelah normalisasi `:param` dan `{param}`.
- 9 operasi hanya ada di Swagger dan belum boleh dipanggil frontend.

## 3. Runtime and security boundary

- Base URL lokal: `NEXT_PUBLIC_API_URL` (default workspace: `http://localhost:5003`).
- Prefix API: `/api/v1`.
- Browser hanya memanggil endpoint user-facing yang dinyatakan pada §6.
- Endpoint `/api/v1/internal/*` adalah service/operator boundary dan tidak boleh dipanggil dari browser.
- Frontend tidak mengirim API key OpenAI, kredensial SMTP, atau secret backend.
- UI company switcher tidak boleh mengubah company scope JWT. Pemilihan company hanya boleh memilih company yang memang diberikan oleh auth context backend.

## 4. Request headers

| Header | Aturan |
|---|---|
| `Authorization` | Wajib untuk route user-facing: `Bearer <access-token>`. |
| `X-Tenant-Id` | Bukan sumber scope yang dipercaya untuk frontend; JWT tenant claim harus menjadi sumber utama. |
| `X-Company-Id` | Bukan cara untuk melewati company scope JWT. Backend harus menolak mismatch. |
| `Idempotency-Key` | Wajib pada command yang mengubah state; string unik, 16–255 karakter. |
| `If-Match` | Wajib pada operasi versioned update/lifecycle; berisi versi numerik saat ini. |
| `X-Request-Id` | Opsional; backend membuat ID jika tidak dikirim. |
| `X-Correlation-Id` | Opsional untuk korelasi UI/support. |
| `X-Trace-Id` | Opsional untuk tracing. |
| `Content-Type` | `application/json` untuk request body JSON. |

`X-Request-Id`, `X-Correlation-Id`, dan `X-Trace-Id` yang dikembalikan backend harus dipertahankan pada error logging client, bukan ditampilkan sebagai detail internal kepada user.

## 5. Response and error envelope

Success:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "request_id": "...",
    "correlation_id": "..."
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Public-safe message"
  },
  "meta": {
    "request_id": "...",
    "correlation_id": "...",
    "retryable": false
  }
}
```

Frontend memakai `error.code` untuk state UI dan `error.message` untuk pesan public-safe. Frontend tidak menampilkan stack trace, raw provider error, SQL error, prompt, atau secret.

| Status/code | Perlakuan frontend |
|---|---|
| `400 VALIDATION_ERROR` | Tampilkan error field/form. |
| `401 UNAUTHORIZED` | Hentikan request dan arahkan ke login dummy/auth flow yang tersedia. |
| `403 FORBIDDEN` | Tampilkan akses tidak diizinkan; jangan retry otomatis. |
| `404 NOT_FOUND` | Tampilkan resource tidak ditemukan. |
| `409 VERSION_CONFLICT` | Muat ulang resource dan minta user meninjau versi terbaru. |
| `422 BUSINESS_RULE_FAILED` | Tampilkan aturan bisnis yang gagal. |
| `429`, `503`, `504` dengan `retryable=true` | Retry terbatas dengan backoff di client/query layer. |
| `502 AI_OUTPUT_*` atau error non-retryable lain | Tampilkan kegagalan proses tanpa mengarang data pengganti. |

## 6. Implemented frontend-safe endpoints

| Capability | Method and route | Status |
|---|---|---|
| Executive Summary | `GET /api/v1/dashboard/executive-summary?period=24jam` | Implemented; backend menentukan Top 5. |
| Issue search/list | `GET /api/v1/issues?company_id=&page=&limit=&q=&status=&priority=` | Implemented; pagination backend. |
| Issue detail | `GET /api/v1/issues/:issueId` | Implemented; scoped ke company dari auth context. |
| Effective Company Context | `GET /api/v1/companies/:companyId/context` | Implemented. |
| Replace/version Company Context | `PUT /api/v1/companies/:companyId/context` | Implemented; `Idempotency-Key` + `If-Match`. |
| Create context draft | `POST /api/v1/company-context/draft` | Implemented; async `202`; source URL/text. |
| Read context draft | `GET /api/v1/company-context/drafts/:draftId` | Implemented. |
| Edit context draft | `PATCH /api/v1/company-context/drafts/:draftId` | Implemented; versioned/idempotent. |
| Submit context review | `POST /api/v1/company-context/drafts/:draftId/submit-review` | Implemented; versioned/idempotent. |
| Approve context | `POST /api/v1/company-context/drafts/:draftId/approve` | Implemented; human authorization; versioned/idempotent. |
| Alert preference | `PUT /api/v1/companies/:companyId/alert-preference` | Implemented; preference only, does not send email. |
| Alert preference hydration | `GET /api/v1/companies/:companyId/alert-preference` | Implemented; saved preference read model. |
| Authorized companies | `GET /api/v1/companies` | Implemented; backend-authorized scope only. |
| Saved issue list | `GET /api/v1/saved/issues` | Implemented; tenant/company/actor scoped. |
| Save issue | `POST /api/v1/issues/:issueId/saved` | Implemented; idempotent command. |
| Unsave issue | `DELETE /api/v1/issues/:issueId/saved` | Implemented; idempotent command. |
| Alert inbox | `GET /api/v1/inbox/emails` | Implemented; delivered audit events only. |
| Mark alert read | `PATCH /api/v1/inbox/emails/:emailId/read` | Implemented; idempotent state transition. |
| Report list | `GET /api/v1/reports` | Implemented; type/status filters and pagination. |
| Report detail | `GET /api/v1/reports/:reportId` | Implemented; report, narrative, and activity payload. |
| Submit report review | `POST /api/v1/reports/:reportId/review` | Implemented; currently only `action=submit`. |
| Approve report | `POST /api/v1/reports/:reportId/approve` | Implemented; human-only. |
| Share report | `POST /api/v1/reports/:reportId/share` | Implemented; human-only; `202`. |
| Constrained narrative rewrite | `POST /api/v1/reports/:reportId/narrative/:reportNarrativeId/rewrite` | Implemented; human-authorized span + version check. |

### Pagination contract

`GET /api/v1/issues` returns pagination inside `data.meta`:

```json
{
  "items": [],
  "meta": { "page": 1, "limit": 20, "total": 0 }
}
```

Frontend owns page navigation only. Frontend must not infer “all issues” from the Executive Summary response. The actual issue-list route currently does not apply a `period` filter, even though the current Swagger advertises one; the frontend must not send or depend on it until backend contract is corrected.

### Executive Summary contract

The response includes `issues` and `top5_limit: 5`. Backend excludes `selesai`, stale/no-current-gated-analysis, and issues without valid priority, then ranks by backend rules. Frontend renders the returned order and does not sort, re-rank, or apply another `slice(0, 5)`.

## 7. DTO rules

### Issue card/detail

The guaranteed issue identity/lifecycle fields are:

```ts
type IssueStatus = "baru" | "berkembang" | "dipantau" | "selesai";
type Priority = "tinggi" | "sedang" | "rendah" | null;

type Issue = {
  issue_id: string;
  title: string;
  one_liner: string | null;
  status: IssueStatus;
  priority: Priority;
  first_seen_at: string;
  last_developed_at: string | null;
  version: number;
};
```

Issue detail may additionally contain `articles`, `developments`, `analysis`, and `priority`. The Mockup fields `whatHappened`, `whyMatters`, `impacts`, `risks`, `watch`, `facts`, and `assumption` are not a guaranteed backend DTO. Frontend must not fabricate them; either map them from validated nested data in a later integration sprint or close a backend DTO extension first.

### Company Context

Effective context includes `context_id`, `company_id`, `version`, `status`, `source`, `draft_id`, `fields`, `change_reason`, `updated_by`, `created_at`, and `updated_at`. Draft lifecycle is `draft → in_review → approved`; approval creates the effective context.

Draft input supports source `url` or `text`. Mockup file upload is not an available backend contract.

### Alert preference

```ts
type AlertPreference = {
  recipient_id: string;
  direct_high_enabled: boolean;
  daily_digest_enabled: boolean;
  timezone: string;
  quiet_hours: { start: string; end: string } | null;
};
```

Mockup weekly/monthly schedules, arbitrary email channels, and recipient editing are not implied by this DTO.

### Report lifecycle command

Lifecycle is strictly `draft → in_review → approved → shared`. AI cannot approve or share. The frontend must send the current version through `If-Match` (or the explicitly supported body version) and an `Idempotency-Key` for state-changing commands.

The current review implementation accepts only `action: "submit"`; Mockup “request changes” must remain unavailable until backend support exists.

## 8. Mockup-to-contract mapping

| Mockup feature | Contract decision |
|---|---|
| Executive Summary Top 5 | Integrate with dashboard endpoint; render backend order. |
| Global issue search | Use `/issues` pagination/search; search results are not limited to Top 5. |
| Issue drawer | Use issue detail DTO; do not assume Mockup-only flattened analysis fields. |
| Company switcher | Only switch within JWT-authorized company scope; no cross-company data query. Issues are per company, never shared across companies. |
| Alerts inbox/history | Use `/inbox/emails`; unread state is backend-owned and scoped. |
| Direct email sending | Do not call internal eligibility/blurb/delivery endpoints from browser. |
| Saved issues | Use saved issue endpoints; durable state is backend-owned. |
| Reports list/detail | Use report read endpoints; frontend does not synthesize report content. |
| Report review/approve/share | Wire only in a later sprint with human authorization, version check, idempotency, and lifecycle gates. |
| Company Context onboarding | Use URL/text draft flow; do not wire local file upload as backend upload. |
| Mark issue done | Use `POST /api/v1/issues/:issueId/complete`; human-only, versioned, idempotent. |
| Feedback modal | Use advisory feedback endpoint; it never mutates relevance or priority. |
| Profile/team/billing | May remain dummy as explicitly allowed; must not be presented as backend-integrated. |

## 9. Internal-only backend operations

The following are implemented but are not browser APIs:

- ingest trigger;
- article/source lookup;
- relevance classify and rationale;
- issue matching, formation, title, and one-liner;
- issue analysis, labels, and promote-current;
- priority and priority reason;
- report draft and narrative generation;
- alert eligibility, direct blurb, and delivery.

They are worker/service boundaries. They may be invoked by backend workers or controlled operator tooling only. They must not receive browser-controlled recipient, subject, OpenAI key, SMTP credential, or unrestricted tenant/company values.

## 10. Swagger-only operations — unavailable

These three internal operations remain unsupported from the browser:

1. `GET /api/v1/internal/runs/:runId`
2. `POST /api/v1/internal/runs/:runId/replay`
3. All `/api/v1/internal/*` AI/worker operations.

No frontend route, hook, mock fallback, or button may silently depend on these operations.

## 11. Known contract gaps to resolve before related UI integration

- Issue detail needs a stable DTO decision for the nine-section analysis view shown by Mockup.
- Report, alert inbox, saved issue, feedback, and source read models are now implemented; PostgreSQL mode is selected with `AI_PERSISTENCE_MODE=postgres`.
- `request_changes` is documented in Swagger but not implemented in the current route/service.
- The issue list `period` query is applied by the backend read service.
- Company Context routes should be verified to have the same explicit auth middleware boundary as other user-facing routes before production exposure.
- Product decisions still open: material update definition, whether `low` can form an issue, and behavior when a completed issue receives a new relevant article.

## 12. Sprint acceptance criteria

Sprint 01 is complete when:

- frontend API constants contain no Swagger-only read/write operation;
- every integrated endpoint is labeled implemented or explicitly blocked;
- all state-changing calls reserve `Idempotency-Key` and applicable `If-Match` behavior;
- company/tenant scope is taken from trusted auth context;
- frontend uses the documented success/error envelopes;
- frontend does not rank Top 5 or call `/internal/*`;
- Mockup-only actions are either mapped to a real route or visibly marked unavailable/dummy;
- subsequent UI sprints use this document instead of inventing route or DTO behavior.
