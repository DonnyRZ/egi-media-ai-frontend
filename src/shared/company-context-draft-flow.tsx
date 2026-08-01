"use client";

import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check } from "lucide-react";

import {
  DEFAULT_COMPANY_LANGUAGE,
  resolveCompanyLanguage,
  type CompanyLanguage,
} from "@/shared/company-language";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { ScopeRequired } from "@/shared/prerequisite-gate";
import { useSessionStore } from "@/shared/session-store";
import { useWorkspaceScope } from "@/shared/workspace-scope";
import type { ApiSuccessResponse, CompanyContextCompletenessDto, CompanyContextDto, LanguagePreferenceDto } from "@/shared/types/api.types";

type SourceMode = "pdf" | "url" | "text";
type DraftStatus = "draft" | "in_review" | "approved";
type Draft = {
  draft_id: string;
  company_id: string;
  status: DraftStatus;
  is_effective: boolean;
  revision: number;
  result: { status?: string; context?: Record<string, unknown>; field_review?: Record<string, string> | null; completeness?: CompanyContextCompletenessDto | null };
  review: {
    submitted_by: string | null;
    submitted_at: string | null;
    approved_by: string | null;
    approved_at: string | null;
    note: string | null;
  };
  created_at: string;
  updated_at: string;
};

async function createDraft(
  companyId: string,
  mode: SourceMode,
  sourceValue: string,
  extractionLanguage: CompanyLanguage,
) {
  const source = mode === "url" ? { type: "url", url: sourceValue } : { type: "text", text: sourceValue };
  const response = await axiosClient.post<ApiSuccessResponse<{ draft: Draft }>>(
    API_ENDPOINTS.companyContextDraft,
    { source, extraction_language: extractionLanguage },
    { headers: { "Idempotency-Key": key("create") } },
  );
  return response.data.data.draft;
}
async function createPdfDraft(file: File, extractionLanguage: CompanyLanguage) {
  if (file.size > 10 * 1024 * 1024) throw new Error("The PDF must be 10 MB or smaller.");
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new Error("Select a PDF company profile.");
  const form = new FormData();
  form.append("file", file);
  form.append("extraction_language", extractionLanguage);
  const response = await axiosClient.post<ApiSuccessResponse<{ draft: Draft }>>(API_ENDPOINTS.companyContextPdfDraft, form, {
    headers: { "Content-Type": undefined, "Idempotency-Key": key("pdf") },
    timeout: 180_000,
  });
  return response.data.data.draft;
}
async function readDraft(draftId: string) {
  const response = await axiosClient.get<ApiSuccessResponse<Draft>>(API_ENDPOINTS.companyContextDraftById(draftId));
  return response.data.data;
}
async function editDraft(draft: Draft, fields: Record<string, unknown>, fieldReview: Record<string, string>, note: string) {
  const response = await axiosClient.patch<ApiSuccessResponse<Draft>>(
    API_ENDPOINTS.companyContextDraftById(draft.draft_id),
    { fields, field_review: fieldReview, review_note: note || null },
    { headers: { "If-Match": String(draft.revision), "Idempotency-Key": key("edit") } },
  );
  return response.data.data;
}
async function approveDraft(draft: Draft, note: string) {
  const response = await axiosClient.post<
    ApiSuccessResponse<{
      draft: Draft;
      effective_context: CompanyContextDto;
      management_identity?: CompanyContextDto["management_identity"];
    }>
  >(
    API_ENDPOINTS.companyContextDraftApprove(draft.draft_id),
    { approval_note: note || null },
    { headers: { "If-Match": String(draft.revision), "Idempotency-Key": key("approve") } },
  );
  return response.data.data;
}

async function retryManagementIdentity(companyId: string) {
  const response = await axiosClient.post<
    ApiSuccessResponse<{ management_identity: NonNullable<CompanyContextDto["management_identity"]> }>
  >(
    API_ENDPOINTS.companyContextIdentityRetry(companyId),
    {},
    { headers: { "Idempotency-Key": key("identity-retry") } },
  );
  return response.data.data.management_identity;
}
/** Owner/admin Save: persist fields then activate. Requires company_context.approve on the approve step. */
async function saveAndActivate(draft: Draft, fields: Record<string, unknown>, fieldReview: Record<string, string>, note: string) {
  const saved = await editDraft(draft, fields, fieldReview, note);
  return approveDraft(saved, note);
}
async function readEffectiveContext(companyId: string) {
  const response = await axiosClient.get<ApiSuccessResponse<CompanyContextDto>>(API_ENDPOINTS.companyContext(companyId));
  return response.data.data;
}
function key(action: string) {
  return `company-context-${action}-${crypto.randomUUID()}`;
}

export function CompanyContextDraftFlow() {
  const scope = useWorkspaceScope();

  return (
    <ScopeRequired
      require="company"
      scope={scope}
      title="Company required for context draft"
      reason="Context drafts are scoped to an active company. Select a company before generating or reviewing a draft."
      nextStep="Pick a company in the header switcher. If none exist, provision one under Platform, then return here."
    >
      <CompanyContextDraftFlowBody />
    </ScopeRequired>
  );
}

function CompanyContextDraftFlowBody() {
  const companyId = useSessionStore((state) => state.activeCompanyId);
  const canApprove = useSessionStore((state) => state.permissions.includes("company_context.approve"));
  const canDraft = useSessionStore((state) => state.permissions.includes("company_context.draft"));
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<SourceMode>("pdf");
  const [sourceValue, setSourceValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [fields, setFields] = useState<Record<string, unknown>>({});
  const [fieldReview, setFieldReview] = useState<Record<string, string>>({});
  const [saveNote, setSaveNote] = useState("");
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [identityStatus, setIdentityStatus] = useState<string | null>(null);
  const languageQuery = useQuery({
    queryKey: ["language-preference", companyId],
    queryFn: async () => {
      const response = await axiosClient.get<ApiSuccessResponse<LanguagePreferenceDto>>(
        API_ENDPOINTS.languagePreferenceRead(companyId as string),
      );
      return response.data.data;
    },
    enabled: Boolean(companyId),
    staleTime: 30_000,
    retry: false,
  });
  const extractionLanguage = resolveCompanyLanguage(languageQuery.data?.language ?? DEFAULT_COMPANY_LANGUAGE);
  const draftQuery = useQuery({
    queryKey: ["company-context-draft", draft?.draft_id],
    queryFn: () => readDraft(draft!.draft_id),
    enabled: Boolean(draft?.draft_id),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  const effectiveQuery = useQuery({
    queryKey: ["company-context", companyId],
    queryFn: () => readEffectiveContext(companyId as string),
    enabled: Boolean(companyId && draft?.status === "approved"),
    staleTime: 0,
  });
  const createMutation = useMutation({
    mutationFn: () => {
      if (!companyId) throw new Error("Company scope is required before generating a draft.");
      if (mode === "pdf") {
        if (!selectedFile) throw new Error("Select a company profile PDF first");
        return createPdfDraft(selectedFile, extractionLanguage);
      }
      if (!sourceValue.trim()) throw new Error("Company scope and a URL/text source are required");
      return createDraft(companyId, mode, sourceValue.trim(), extractionLanguage);
    },
    onSuccess: (data) => {
      setDraft(data);
      setFields(data.result.context ?? {});
      setFieldReview(data.result.field_review ?? data.result.completeness?.field_review ?? {});
      queryClient.setQueryData(["company-context-draft", data.draft_id], data);
      setNotice({
        kind: "success",
        text: canApprove
          ? "Draft generated. Edit fields if needed, then Save to make this context active."
          : "Draft generated. Edit and save the draft. Activation requires a role with approve permission.",
      });
    },
    onError: (error) => setNotice({ kind: "error", text: errorMessage(error) }),
  });
  const saveMutation = useMutation({
    mutationFn: async () => {
      const current = currentDraft();
      if (canApprove && coreComplete && (current.status === "draft" || current.status === "in_review")) {
        return saveAndActivate(current, fields, fieldReview, saveNote);
      }
      if (!canDraft) throw Object.assign(new Error("This action is not authorized for the current company scope."), { code: "FORBIDDEN" });
      const saved = await editDraft(current, fields, fieldReview, saveNote);
      return {
        draft: saved,
        effective_context: null as CompanyContextDto | null,
        management_identity: null as CompanyContextDto["management_identity"],
      };
    },
    onSuccess: (data) => {
      setDraft(data.draft);
      queryClient.setQueryData(["company-context-draft", data.draft.draft_id], data.draft);
      if (data.effective_context) {
        const status = data.management_identity?.status ?? data.effective_context.management_identity?.status ?? "missing";
        setIdentityStatus(status);
        setNotice({
          kind: status === "ready" ? "success" : "error",
          text:
            status === "ready"
              ? "Context saved and activated. Management identity is ready for news intake."
              : `Context saved and activated, but management identity is ${status}. Retry identity before Pull or automatic intake.`,
        });
        queryClient.invalidateQueries({ queryKey: ["company-context", companyId] });
        queryClient.invalidateQueries({ queryKey: ["news-intake-status", companyId] });
      } else {
        setNotice({
          kind: "success",
          text: coreComplete
            ? "Draft saved. Activation requires a role with company context approve permission."
            : "Draft saved. Add the missing core company facts before it can become active.",
        });
      }
    },
    onError: (error) => setNotice({ kind: "error", text: errorMessage(error) }),
  });
  const retryIdentityMutation = useMutation({
    mutationFn: () => {
      if (!companyId) throw new Error("Company scope is required.");
      return retryManagementIdentity(companyId);
    },
    onSuccess: (identity) => {
      setIdentityStatus(identity.status);
      setNotice({
        kind: identity.status === "ready" ? "success" : "error",
        text:
          identity.status === "ready"
            ? "Management identity is ready. Manual Pull and automatic intake can run."
            : `Management identity is still ${identity.status}. ${identity.error_message ?? "Try again or revise the company context."}`,
      });
      void queryClient.invalidateQueries({ queryKey: ["company-context", companyId] });
      void queryClient.invalidateQueries({ queryKey: ["news-intake-status", companyId] });
    },
    onError: (error) => setNotice({ kind: "error", text: errorMessage(error) }),
  });
  // Mutations update the local draft immediately. If-Match must use that latest
  // revision instead of a stale React Query snapshot.
  const currentDraft = () => {
    if (!draft) throw new Error("No draft is loaded");
    return draft;
  };
  const shownDraft = draft ?? draftQuery.data;
  const isBusy = createMutation.isPending || saveMutation.isPending || retryIdentityMutation.isPending;
  const resolvedIdentityStatus =
    identityStatus ??
    effectiveQuery.data?.management_identity?.status ??
    null;
  const canGenerate =
    Boolean(companyId) && !isBusy && (mode === "pdf" ? Boolean(selectedFile) : Boolean(sourceValue.trim()));
  const isEditable = shownDraft && (shownDraft.status === "draft" || shownDraft.status === "in_review");
  const coreComplete = isDraftReviewComplete(fields, fieldReview);
  const saveLabel = canApprove && coreComplete ? "Save" : "Save draft";

  function updateField(keyName: string, value: string) {
    const existing = fields[keyName];
    const nextValue = Array.isArray(existing) ? value.split("\n").map((item) => item.trim()).filter(Boolean) : value;
    setFields((current) => ({
      ...current,
      [keyName]: nextValue,
    }));
    if (hasFieldValue(nextValue)) setFieldReview((current) => ({ ...current, [keyName]: "user_confirmed" }));
  }
  function confirmField(keyName: string) {
    setFieldReview((current) => ({ ...current, [keyName]: hasFieldValue(fields[keyName]) ? "user_confirmed" : "missing" }));
  }
  function markNotDisclosed(keyName: string) {
    setFields((current) => ({ ...current, [keyName]: Array.isArray(current[keyName]) ? [] : null }));
    setFieldReview((current) => ({ ...current, [keyName]: "reviewed_none_disclosed" }));
  }
  function refreshDraft() {
    draftQuery.refetch().then((result) => {
      if (result.data) {
        setDraft(result.data);
        setFields(result.data.result.context ?? {});
        setFieldReview(result.data.result.field_review ?? result.data.result.completeness?.field_review ?? {});
      }
    });
  }
  const sourceInput =
    mode === "pdf" ? (
      <>
        <input
          className="context-flow-input"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
        />
        <small className="context-flow-helper">
          Upload one company profile PDF, up to 10 MB. Text is extracted securely before the AI draft is generated.
        </small>
        {selectedFile && (
          <div className="context-pipeline-state">
            <i />
            {selectedFile.name}
          </div>
        )}
      </>
    ) : mode === "url" ? (
      <>
        <input
          className="context-flow-input"
          value={sourceValue}
          onChange={(event) => setSourceValue(event.target.value)}
          placeholder="https://company.example/about"
        />
        <small className="context-flow-helper">The backend will fetch and sanitize the URL.</small>
      </>
    ) : (
      <textarea
        className="context-flow-textarea"
        value={sourceValue}
        onChange={(event) => setSourceValue(event.target.value)}
        placeholder="Paste the approved company context source text here..."
      />
    );

  return (
    <div className="context-flow-page">
      <div className="context-flow-heading">
        <div>
          <h1>Build Company Context</h1>
          <p>
            {canApprove
              ? "Upload a company profile PDF or use a URL, then Save to activate the effective context."
              : "Upload a company profile PDF or use a URL to generate a draft. Saving keeps the draft; activation requires approve permission."}
          </p>
        </div>
      </div>
      <section className="context-flow-card source-card">
        <div className="context-flow-step">
          <span>01</span>
          <div>
            <span className="context-label">Source input</span>
            <h2>Where should the draft come from?</h2>
          </div>
        </div>
        <div className="source-mode-tabs">
          <button className={mode === "pdf" ? "is-active" : ""} onClick={() => setMode("pdf")}>
            Company PDF
          </button>
          <button className={mode === "url" ? "is-active" : ""} onClick={() => setMode("url")}>
            URL
          </button>
          <button className={mode === "text" ? "is-active" : ""} onClick={() => setMode("text")}>
            Text fallback
          </button>
        </div>
        {sourceInput}
        <small className="context-flow-helper" data-testid="context-draft-language-note">
          Existing drafts are not retranslated when you change Display language. Only newly generated drafts use the current preference.
        </small>
        <button
          className="context-action"
          data-testid="context-draft-generate"
          disabled={!canGenerate}
          onClick={() => {
            if (!companyId) return;
            createMutation.mutate();
          }}
        >
          {createMutation.isPending ? "Extracting and generating..." : "Generate draft"}
        </button>
      </section>
      {shownDraft && (
        <>
          <div className="context-progress">
            <ProgressStep label="Generated" active status={shownDraft.status} />
            <ProgressStep label="Active" active={shownDraft.status === "approved"} status={shownDraft.status} />
          </div>
          <section className="context-flow-card">
            <div className="context-flow-step">
              <span>02</span>
              <div>
                <span className="context-label">Draft revision {shownDraft.revision}</span>
                <h2>Review generated fields</h2>
              </div>
              <span className={`context-status-badge flow-status-${shownDraft.status}`}>
                {shownDraft.status === "approved" ? "active" : shownDraft.status.replace("_", " ")}
              </span>
            </div>
            <div className="context-pipeline-state">
              <i />
              {shownDraft.result.status === "insufficient_data"
                ? "Backend marked the source insufficient for a complete context."
                : shownDraft.status === "approved"
                  ? "This draft has been activated as the effective company context."
                  : "Pipeline output is ready. Edit fields, then Save."}
              <button onClick={refreshDraft}>Refresh</button>
            </div>
            {!coreComplete && (
              <div className="context-missing-fields" role="status" data-testid="context-completeness">
                <span>Review required before activation</span>
                <div>
                  {reviewBlockingFields(fields, fieldReview).map((field) => <em key={field}>{humanize(field)}</em>)}
                </div>
                <small className="context-flow-helper">Confirm AI proposals or mark undisclosed fields. The AI will not turn an inference into a fact automatically.</small>
              </div>
            )}
            <div className="context-edit-grid">
              {Object.entries(fields).map(([keyName, value]) => (
                <label className="context-edit-field" key={keyName}>
                  <span>{humanize(keyName)} <small className={`context-review-status status-${fieldReview[keyName] || "missing"}`}>{humanize(fieldReview[keyName] || "missing")}</small></span>
                  {Array.isArray(value) ? (
                    <textarea
                      value={value.join("\n")}
                      onChange={(event) => updateField(keyName, event.target.value)}
                      disabled={!isEditable || isBusy}
                    />
                  ) : (
                    <textarea
                      value={String(value ?? "")}
                      onChange={(event) => updateField(keyName, event.target.value)}
                      disabled={!isEditable || isBusy}
                    />
                  )}
                  {fieldReview[keyName] === "ai_proposed" && (
                    <button type="button" className="context-review-button" onClick={() => confirmField(keyName)} disabled={isBusy}>
                      Confirm AI proposal
                    </button>
                  )}
                  {AI_REVIEW_CONTEXT_FIELDS.includes(keyName as (typeof AI_REVIEW_CONTEXT_FIELDS)[number]) && fieldReview[keyName] !== "reviewed_none_disclosed" && (
                    <button type="button" className="context-review-button secondary" onClick={() => markNotDisclosed(keyName)} disabled={isBusy}>
                      Mark not disclosed
                    </button>
                  )}
                </label>
              ))}
            </div>
            {isEditable && (
              <>
                <label className="preference-field">
                  <span>Note</span>
                  <textarea
                    value={saveNote}
                    onChange={(event) => setSaveNote(event.target.value)}
                    maxLength={1000}
                    placeholder="Optional note for the save record"
                  />
                </label>
                <div className="context-flow-actions">
                  <button
                    className="context-action"
                    data-testid="context-draft-save"
                    disabled={isBusy || (!canApprove && !canDraft)}
                    onClick={() => saveMutation.mutate()}
                  >
                    {saveMutation.isPending ? "Saving..." : saveLabel}
                  </button>
                </div>
              </>
            )}
            {shownDraft.status === "approved" && (
              <div className="context-approved-state" data-testid="context-approved-state">
                <strong>Active</strong>
                <span>The effective context has been refreshed from the backend.</span>
                {resolvedIdentityStatus && (
                  <p data-testid="context-draft-identity-status">
                    Management identity: <strong>{resolvedIdentityStatus}</strong>
                    {resolvedIdentityStatus !== "ready"
                      ? " — news intake stays blocked until identity is ready."
                      : " — ready for news intake."}
                  </p>
                )}
                {canApprove && resolvedIdentityStatus && resolvedIdentityStatus !== "ready" && (
                  <button
                    type="button"
                    className="context-action"
                    data-testid="context-draft-retry-identity"
                    disabled={isBusy}
                    onClick={() => {
                      setNotice(null);
                      retryIdentityMutation.mutate();
                    }}
                  >
                    {retryIdentityMutation.isPending ? "Retrying identity…" : "Retry identity"}
                  </button>
                )}
              </div>
            )}
          </section>
        </>
      )}
      {effectiveQuery.data && (
        <section className="context-effective-refresh">
          <span className="context-label">Effective context refreshed</span>
          <strong>Version {effectiveQuery.data.version}</strong>
          <span>Updated {formatDate(effectiveQuery.data.updated_at)}</span>
        </section>
      )}
      {notice && (
        <div className={`preference-notice ${notice.kind}`} role="status">
          {notice.text}
        </div>
      )}
    </div>
  );
}

function ProgressStep({ label, active, status }: { label: string; active?: boolean; status: string }) {
  return (
    <div className={`context-progress-step ${active ? "is-active" : ""}`}>
      <span>{active ? <Check size={13} strokeWidth={2.5} aria-hidden="true" /> : "·"}</span>
      <strong>{label}</strong>
      <small>{active ? (status === "approved" ? "active" : status.replace("_", " ")) : "Pending"}</small>
    </div>
  );
}
function humanize(value: string) {
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
const REQUIRED_CONTEXT_FIELDS = ["name", "industry", "description", "products", "customers", "regions", "priorities"] as const;
const AI_REVIEW_CONTEXT_FIELDS = ["sub_industry", "competitors", "goals", "risks", "topics", "dependencies"] as const;
function hasFieldValue(value: unknown) { return Array.isArray(value) ? value.length > 0 : typeof value === "string" && value.trim().length > 0; }
function reviewBlockingFields(fields: Record<string, unknown>, review: Record<string, string>) {
  return [...REQUIRED_CONTEXT_FIELDS, ...AI_REVIEW_CONTEXT_FIELDS].filter((field) => {
    if (REQUIRED_CONTEXT_FIELDS.includes(field as (typeof REQUIRED_CONTEXT_FIELDS)[number])) return !hasFieldValue(fields[field]) || review[field] !== "user_confirmed";
    return !["user_confirmed", "reviewed_none_disclosed"].includes(review[field]);
  });
}
function isDraftReviewComplete(fields: Record<string, unknown>, review: Record<string, string>) { return reviewBlockingFields(fields, review).length === 0; }
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function errorMessage(error: unknown) {
  if (isAxiosError<{ error?: { message?: string; code?: string } }>(error)) {
    const code = error.response?.data?.error?.code;
    if (code === "VERSION_CONFLICT") return "This draft is stale. Refresh the draft before saving.";
    if (code === "COMPANY_CONTEXT_INCOMPLETE") return "Review required fields and AI proposals before activating this context.";
    if (code === "UNAUTHORIZED" || code === "FORBIDDEN") return "This action is not authorized for the current company scope.";
    return error.response?.data?.error?.message ?? "The Company Context pipeline could not complete.";
  }
  return error instanceof Error ? error.message : "The Company Context pipeline could not complete.";
}
