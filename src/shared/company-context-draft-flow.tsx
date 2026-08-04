"use client";

import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  FileText,
  Link2,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Type,
  UploadCloud,
  X,
} from "lucide-react";

import {
  DEFAULT_COMPANY_LANGUAGE,
  resolveCompanyLanguage,
  type CompanyLanguage,
} from "@/shared/company-language";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { ScopeRequired } from "@/shared/prerequisite-gate";
import { PermissionGate } from "@/shared/permission-guard";
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
      <PermissionGate
        permission="company_context.draft"
        fallback={
          <div className="context-state">
            <div className="context-state-mark">i</div>
            <div className="eyebrow">Access restricted</div>
            <h1>Context draft access required</h1>
            <p>Your role can view the approved context but cannot create or edit a draft.</p>
          </div>
        }
      >
        <CompanyContextDraftFlowBody />
      </PermissionGate>
    </ScopeRequired>
  );
}

function CompanyContextDraftFlowBody() {
  const companyId = useSessionStore((state) => state.activeCompanyId);
  const canApprove = useSessionStore((state) => state.permissions.includes("company_context.approve"));
  const canDraft = useSessionStore((state) => state.permissions.includes("company_context.draft"));
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<SourceMode>("pdf");
  // Keep each source mode's draft input independent. Switching from Text to
  // URL must never make arbitrary prose look like a valid URL; preserving the
  // value per mode also lets a user move between tabs without losing work.
  const [sourceValues, setSourceValues] = useState<{ url: string; text: string }>({ url: "", text: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [fields, setFields] = useState<Record<string, unknown>>({});
  const [fieldReview, setFieldReview] = useState<Record<string, string>>({});
  const [saveNote, setSaveNote] = useState("");
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const [identityStatus, setIdentityStatus] = useState<string | null>(null);
  const [generationPhase, setGenerationPhase] = useState(0);
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
  const sourceValue = mode === "url" ? sourceValues.url : mode === "text" ? sourceValues.text : "";
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
        text: data.status === "approved"
          ? "Context is active."
          : canApprove
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
  useEffect(() => {
    if (!notice) return;
    requestAnimationFrame(() => noticeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }, [notice]);
  useEffect(() => {
    if (!createMutation.isPending) {
      setGenerationPhase(0);
      return;
    }
    const timer = window.setInterval(() => {
      setGenerationPhase((current) => (current + 1) % GENERATION_STAGES.length);
    }, 1_600);
    return () => window.clearInterval(timer);
  }, [createMutation.isPending]);
  const canGenerate =
    Boolean(companyId) && !isBusy && (mode === "pdf" ? Boolean(selectedFile) : Boolean(sourceValue.trim()));
  const isEditable = shownDraft && (shownDraft.status === "draft" || shownDraft.status === "in_review");
  const coreComplete = isDraftReviewComplete(fields, fieldReview);
  const saveLabel = canApprove && coreComplete ? "Save & activate" : "Save draft";

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
  function updateSourceValue(value: string) {
    if (mode === "pdf") return;
    setSourceValues((current) => ({ ...current, [mode]: value }));
  }
  function clearSelectedFile() {
    setSelectedFile(null);
    setFileInputKey((current) => current + 1);
  }
  function handleSourceTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const currentIndex = SOURCE_MODES.indexOf(mode);
    const nextIndex = event.key === "ArrowRight"
      ? (currentIndex + 1) % SOURCE_MODES.length
      : (currentIndex - 1 + SOURCE_MODES.length) % SOURCE_MODES.length;
    setMode(SOURCE_MODES[nextIndex]);
  }
  async function refreshDraft() {
    try {
      const result = await draftQuery.refetch();
      if (result.data) {
        setDraft(result.data);
        setFields(result.data.result.context ?? {});
        setFieldReview(result.data.result.field_review ?? result.data.result.completeness?.field_review ?? {});
      }
    } catch (error) {
      setNotice({ kind: "error", text: errorMessage(error) });
    }
  }
  const generationSourceLabel = mode === "pdf"
    ? selectedFile?.name ?? "Company profile PDF"
    : mode === "url"
      ? "Company profile URL"
      : "Pasted profile text";
  const sourceInput =
    mode === "pdf" ? (
      <div className="context-file-source">
        <input
          key={fileInputKey}
          id="company-profile-pdf-input"
          type="file"
          accept="application/pdf,.pdf"
          aria-label="Company profile PDF"
          disabled={createMutation.isPending}
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
        />
        <div className="context-file-picker">
          <span className="context-source-icon"><UploadCloud size={19} strokeWidth={1.8} aria-hidden="true" /></span>
          <span className="context-file-picker-copy">
            <strong>{selectedFile ? selectedFile.name : "Choose a company profile PDF"}</strong>
            <small>{selectedFile ? `${formatFileSize(selectedFile.size)} · Ready to analyze` : "PDF only · maximum 10 MB"}</small>
          </span>
          <label className="context-file-picker-button" htmlFor="company-profile-pdf-input">{selectedFile ? "Change file" : "Browse"}</label>
        </div>
        {selectedFile && (
          <div className="context-file-selected" role="status">
            <FileText size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>Selected source</span>
            <button type="button" aria-label="Remove selected company profile PDF" onClick={clearSelectedFile} disabled={createMutation.isPending}><X size={15} aria-hidden="true" /></button>
          </div>
        )}
      </div>
    ) : mode === "url" ? (
      <div className="context-source-field">
        <label htmlFor="company-profile-url-input">Profile URL</label>
        <input
          id="company-profile-url-input"
          className="context-flow-input"
          value={sourceValue}
          aria-label="Company profile URL"
          disabled={createMutation.isPending}
          onChange={(event) => updateSourceValue(event.target.value)}
          placeholder="https://company.example/about"
        />
        <small className="context-flow-helper">The source is fetched and sanitized before analysis.</small>
      </div>
    ) : (
      <div className="context-source-field">
        <label htmlFor="company-profile-text-input">Profile text</label>
        <textarea
          id="company-profile-text-input"
          className="context-flow-textarea"
          value={sourceValue}
          aria-label="Company profile source text"
          disabled={createMutation.isPending}
          onChange={(event) => updateSourceValue(event.target.value)}
          placeholder="Paste the approved company context source text here..."
        />
      </div>
    );

  const groupedFieldKeys = new Set(FIELD_GROUPS.flatMap((group) => group.fields));
  const additionalFieldKeys = Object.keys(fields).filter((keyName) => !groupedFieldKeys.has(keyName));
  const blockedFields = reviewBlockingFields(fields, fieldReview);

  return (
    <div className="context-flow-page">
      <header className="context-flow-heading">
        <div>
          <span className="eyebrow">Company intelligence</span>
          <h1>Build Company Context</h1>
          <p>Create a draft from a company source, review every fact, then activate it.</p>
        </div>
        {shownDraft && <span className={`context-draft-header-status status-${shownDraft.status}`}><span />{shownDraft.status === "approved" ? "Active context" : "Draft in review"}</span>}
      </header>

      {notice && (
        <div ref={noticeRef} className={`context-flow-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
          {notice.kind === "error" ? <AlertCircle size={18} strokeWidth={1.8} aria-hidden="true" /> : <CheckCircle2 size={18} strokeWidth={1.8} aria-hidden="true" />}
          <span>{notice.text}</span>
        </div>
      )}

      <ContextWorkflow status={shownDraft?.status ?? null} isGenerating={createMutation.isPending} />

      <section className="context-flow-card source-card" aria-busy={isBusy}>
        <div className="context-flow-step">
          <span className="context-step-number">01</span>
          <div>
            <span className="context-label">Source</span>
            <h2>Choose a company profile source</h2>
          </div>
          <span className="context-step-side-note">Required</span>
        </div>

        <div className="source-mode-tabs" role="tablist" aria-label="Company profile source">
          <button id="company-profile-tab-pdf" type="button" role="tab" aria-controls="company-profile-source-panel" aria-selected={mode === "pdf"} tabIndex={mode === "pdf" ? 0 : -1} className={mode === "pdf" ? "is-active" : ""} disabled={createMutation.isPending} onClick={() => setMode("pdf")} onKeyDown={handleSourceTabKeyDown}>
            <FileText size={16} strokeWidth={1.8} aria-hidden="true" /> Company PDF
          </button>
          <button id="company-profile-tab-url" type="button" role="tab" aria-controls="company-profile-source-panel" aria-selected={mode === "url"} tabIndex={mode === "url" ? 0 : -1} className={mode === "url" ? "is-active" : ""} disabled={createMutation.isPending} onClick={() => setMode("url")} onKeyDown={handleSourceTabKeyDown}>
            <Link2 size={16} strokeWidth={1.8} aria-hidden="true" /> URL
          </button>
          <button id="company-profile-tab-text" type="button" role="tab" aria-controls="company-profile-source-panel" aria-selected={mode === "text"} tabIndex={mode === "text" ? 0 : -1} className={mode === "text" ? "is-active" : ""} disabled={createMutation.isPending} onClick={() => setMode("text")} onKeyDown={handleSourceTabKeyDown}>
            <Type size={16} strokeWidth={1.8} aria-hidden="true" /> Text fallback
          </button>
        </div>
        <div id="company-profile-source-panel" className="context-source-panel" role="tabpanel" aria-labelledby={`company-profile-tab-${mode}`}>
          {sourceInput}
        </div>
        <small className="context-flow-helper context-language-note" data-testid="context-draft-language-note">
          New drafts use your display language.
        </small>
        <div className="context-source-footer">
          <span className="context-action-hint">{createMutation.isPending ? "Analyzing the selected source..." : saveMutation.isPending ? "Saving the draft..." : retryIdentityMutation.isPending ? "Retrying management identity..." : canGenerate ? "Ready to analyze the selected source." : "Select a source to continue."}</span>
          <button
            className="context-action"
            data-testid="context-draft-generate"
            disabled={!canGenerate}
            onClick={() => {
              if (!companyId) return;
              setNotice(null);
              createMutation.mutate();
            }}
          >
            {createMutation.isPending && <LoaderCircle className="context-spin" size={17} strokeWidth={2} aria-hidden="true" />}
            {createMutation.isPending ? "Building draft..." : "Generate draft"}
          </button>
        </div>
        {createMutation.isPending && <ContextGenerationPanel phase={generationPhase} sourceLabel={generationSourceLabel} />}
      </section>

      {shownDraft && (
        <section className="context-flow-card context-review-card" aria-busy={saveMutation.isPending}>
          <div className="context-flow-step">
            <span className="context-step-number">02</span>
            <div>
              <span className="context-label">Draft revision {shownDraft.revision}</span>
              <h2>Review generated fields</h2>
            </div>
            <span className={`context-status-badge flow-status-${shownDraft.status}`}>
              {shownDraft.status === "approved" ? "Active" : shownDraft.status === "in_review" ? "In review" : "Draft"}
            </span>
          </div>

          <div className="context-draft-toolbar">
            <div className="context-draft-toolbar-copy">
              <span className="context-draft-status-dot" />
              <span>{shownDraft.result.status === "insufficient_data" ? "Source needs additional company facts." : shownDraft.status === "approved" ? "This context is active for the selected company." : "Review the proposals before saving."}</span>
            </div>
            <button type="button" className="context-refresh-button" onClick={() => void refreshDraft()} disabled={draftQuery.isFetching || isBusy}>
              <RefreshCw className={draftQuery.isFetching ? "context-spin" : ""} size={15} strokeWidth={1.9} aria-hidden="true" />
              {draftQuery.isFetching ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {isEditable && blockedFields.length > 0 && (
            <div className="context-missing-fields" role="status" data-testid="context-completeness">
              <div className="context-missing-fields-heading">
                <span className="context-warning-icon"><AlertCircle size={17} strokeWidth={1.8} aria-hidden="true" /></span>
                <div>
                  <strong>{blockedFields.length} {blockedFields.length === 1 ? "field needs" : "fields need"} review</strong>
                  <span>Confirm AI proposals or mark optional facts as not disclosed before activation.</span>
                </div>
              </div>
              <div className="context-missing-field-list">
                {blockedFields.map((field) => <span key={field}>{humanize(field)}</span>)}
              </div>
            </div>
          )}

          <div className="context-review-groups">
            {FIELD_GROUPS.map((group) => (
              <ContextReviewGroup
                key={group.id}
                group={group}
                fields={fields}
                fieldReview={fieldReview}
                isEditable={Boolean(isEditable)}
                isBusy={isBusy}
                onUpdate={updateField}
                onConfirm={confirmField}
                onMarkNotDisclosed={markNotDisclosed}
              />
            ))}
            {additionalFieldKeys.length > 0 && (
              <ContextReviewGroup
                group={{ id: "additional", title: "Additional context", description: "Other fields returned by the context service.", fields: additionalFieldKeys }}
                fields={fields}
                fieldReview={fieldReview}
                isEditable={Boolean(isEditable)}
                isBusy={isBusy}
                onUpdate={updateField}
                onConfirm={confirmField}
                onMarkNotDisclosed={markNotDisclosed}
              />
            )}
          </div>

          {isEditable && (
            <>
              <label className="context-note-field">
                <span>Save note <small>Optional</small></span>
                <textarea value={saveNote} onChange={(event) => setSaveNote(event.target.value)} maxLength={1000} placeholder="Add a note for the review record" disabled={isBusy} />
              </label>
              <div className="context-save-bar">
                <div>
                  <strong>{coreComplete ? "Ready to activate" : "Draft can be saved"}</strong>
                  <span>{coreComplete ? "All generated fields have been reviewed." : "Activation stays blocked until required review is complete."}</span>
                </div>
                <button className="context-action" data-testid="context-draft-save" disabled={isBusy || (!canApprove && !canDraft)} onClick={() => saveMutation.mutate()}>
                  {saveMutation.isPending && <LoaderCircle className="context-spin" size={17} strokeWidth={2} aria-hidden="true" />}
                  {saveMutation.isPending ? "Saving..." : saveLabel}
                </button>
              </div>
            </>
          )}

          {shownDraft.status === "approved" && (
            <div className="context-approved-state" data-testid="context-approved-state">
              <div className="context-approved-heading">
                <span className="context-approved-icon"><CheckCircle2 size={21} strokeWidth={1.8} aria-hidden="true" /></span>
                <div><strong>Context active</strong><span>The effective company context is ready to guide relevance and issue analysis.</span></div>
              </div>
              <div className="context-identity-status" data-testid="context-draft-identity-status">
                {effectiveQuery.isPending && !resolvedIdentityStatus ? <LoaderCircle className="context-spin" size={16} strokeWidth={2} aria-hidden="true" /> : <Sparkles size={16} strokeWidth={1.8} aria-hidden="true" />}
                <span>Management identity: <strong>{resolvedIdentityStatus ?? "checking"}</strong>{resolvedIdentityStatus === "ready" ? " · ready for news intake." : resolvedIdentityStatus ? " · news intake stays blocked until identity is ready." : " · confirming readiness."}</span>
                {canApprove && resolvedIdentityStatus && resolvedIdentityStatus !== "ready" && (
                  <button type="button" className="context-inline-action" data-testid="context-draft-retry-identity" disabled={isBusy} onClick={() => { setNotice(null); retryIdentityMutation.mutate(); }}>
                    {retryIdentityMutation.isPending ? <><LoaderCircle className="context-spin" size={14} aria-hidden="true" /> Retrying...</> : "Retry identity"}
                  </button>
                )}
              </div>
              {effectiveQuery.isError && <div className="context-inline-error" role="alert">Active context confirmation failed. <button type="button" onClick={() => void effectiveQuery.refetch()}>Try again</button></div>}
            </div>
          )}
        </section>
      )}

      {effectiveQuery.data && (
        <section className="context-effective-refresh">
          <span className="context-label">Effective context</span>
          <strong>Version {effectiveQuery.data.version}</strong>
          <span>Updated {formatDate(effectiveQuery.data.updated_at)}</span>
        </section>
      )}
    </div>
  );
}

function ContextWorkflow({ status, isGenerating }: { status: DraftStatus | null; isGenerating: boolean }) {
  const activeStep = isGenerating ? "review" : status === "approved" ? "active" : status ? "review" : "source";
  const steps = [
    { id: "source", label: "Source", detail: isGenerating ? "Source ready" : status ? "Complete" : "Choose a source" },
    { id: "review", label: isGenerating ? "Generating" : "Review", detail: isGenerating ? "Building draft" : status ? "Check every fact" : "Pending" },
    { id: "active", label: "Activate", detail: status === "approved" ? "Context active" : "Pending" },
  ];
  return (
    <ol className="context-workflow" aria-label="Company context workflow">
      {steps.map((step, index) => {
        const stepIndex = steps.findIndex((item) => item.id === activeStep);
        const state = step.id === activeStep ? "is-current" : index < stepIndex || (step.id === "source" && Boolean(status)) || (step.id === "review" && status === "approved") ? "is-complete" : "";
        return <li className={`context-workflow-step ${state}`} key={step.id}><span>{state === "is-complete" ? <Check size={14} strokeWidth={2.5} aria-hidden="true" /> : index + 1}</span><div><strong>{step.label}</strong><small>{step.detail}</small></div>{index < steps.length - 1 && <i />}</li>;
      })}
    </ol>
  );
}

function ContextGenerationPanel({ phase, sourceLabel }: { phase: number; sourceLabel: string }) {
  return (
    <div className="context-generation-panel" data-testid="context-generation-state" role="status" aria-live="polite" aria-busy="true">
      <div className="context-generation-visual" aria-hidden="true"><div className="context-generation-orbit"><span /><span /><span /></div><div className="context-generation-core"><Sparkles size={20} strokeWidth={1.8} /></div></div>
      <span className="context-label">Generating context</span>
      <h3>Building a reviewable draft</h3>
      <p>Analyzing {sourceLabel}</p>
      <ol className="context-generation-steps">
        {GENERATION_STAGES.map((stage, index) => <li className={index < phase ? "is-complete" : index === phase ? "is-current" : ""} key={stage.id}><span>{index < phase ? <Check size={12} strokeWidth={2.5} aria-hidden="true" /> : index + 1}</span>{stage.label}</li>)}
      </ol>
      <div className="context-generation-progress" role="progressbar" aria-label="Context generation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={GENERATION_PROGRESS[phase]}><span style={{ width: `${GENERATION_PROGRESS[phase]}%` }} /></div>
      <small>Keep this page open. You can review and correct every proposed fact before saving.</small>
    </div>
  );
}

function ContextReviewGroup({ group, fields, fieldReview, isEditable, isBusy, onUpdate, onConfirm, onMarkNotDisclosed }: ContextReviewGroupProps) {
  const reviewed = !isEditable
    ? group.fields.filter((field) => field in fields).length
    : group.fields.filter((field) => {
        if (REQUIRED_CONTEXT_FIELDS.includes(field as (typeof REQUIRED_CONTEXT_FIELDS)[number])) return hasFieldValue(fields[field]) && fieldReview[field] === "user_confirmed";
        return ["user_confirmed", "reviewed_none_disclosed"].includes(fieldReview[field]);
      }).length;
  return (
    <section className="context-review-group" aria-labelledby={`context-review-group-${group.id}`}>
      <div className="context-review-group-heading">
        <div><span className="context-label">{group.id === "core" ? "Required facts" : "Leadership context"}</span><h3 id={`context-review-group-${group.id}`}>{group.title}</h3><p>{isEditable ? group.description : "Saved in the active company context."}</p></div>
        <span className={`context-review-count ${reviewed === group.fields.length ? "is-complete" : ""}`}>{reviewed}/{group.fields.length} reviewed</span>
      </div>
      <div className="context-edit-grid">
        {group.fields.filter((keyName) => keyName in fields).map((keyName) => <ContextFieldEditor key={keyName} keyName={keyName} value={fields[keyName]} review={fieldReview[keyName]} isEditable={isEditable} isBusy={isBusy} onUpdate={onUpdate} onConfirm={onConfirm} onMarkNotDisclosed={onMarkNotDisclosed} />)}
      </div>
    </section>
  );
}

function ContextFieldEditor({ keyName, value, review, isEditable, isBusy, onUpdate, onConfirm, onMarkNotDisclosed }: ContextFieldEditorProps) {
  const isOptional = AI_REVIEW_CONTEXT_FIELDS.includes(keyName as (typeof AI_REVIEW_CONTEXT_FIELDS)[number]);
  const displayReview = isEditable ? review || "missing" : "user_confirmed";
  const reviewLabel = !isEditable ? "Saved" : review === "ai_proposed" ? "AI proposed" : review === "user_confirmed" ? "Reviewed" : review === "reviewed_none_disclosed" ? "Not disclosed" : "Needs review";
  return (
    <div className={`context-edit-field field-${keyName} ${isEditable && review === "missing" ? "is-missing" : ""}`}>
      <div className="context-edit-field-heading"><label htmlFor={`context-field-${keyName}`}>{humanize(keyName)}</label><span className={`context-review-status status-${displayReview}`}>{reviewLabel}</span></div>
      <textarea id={`context-field-${keyName}`} value={Array.isArray(value) ? value.join("\n") : String(value ?? "")} aria-label={`${humanize(keyName)} field`} onChange={(event) => onUpdate(keyName, event.target.value)} disabled={!isEditable || isBusy} />
      {isEditable && <div className="context-review-actions">
        {review === "ai_proposed" && <button type="button" className="context-review-button" onClick={() => onConfirm(keyName)} disabled={isBusy}><Check size={14} strokeWidth={2.2} aria-hidden="true" />Confirm AI proposal</button>}
        {isOptional && review !== "reviewed_none_disclosed" && <button type="button" className="context-review-button secondary" onClick={() => onMarkNotDisclosed(keyName)} disabled={isBusy}>Mark not disclosed</button>}
      </div>}
    </div>
  );
}
function humanize(value: string) {
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
type ContextFieldGroup = { id: string; title: string; description: string; fields: string[] };
type ContextReviewGroupProps = {
  group: ContextFieldGroup;
  fields: Record<string, unknown>;
  fieldReview: Record<string, string>;
  isEditable: boolean;
  isBusy: boolean;
  onUpdate: (keyName: string, value: string) => void;
  onConfirm: (keyName: string) => void;
  onMarkNotDisclosed: (keyName: string) => void;
};
type ContextFieldEditorProps = Omit<ContextReviewGroupProps, "group" | "fields" | "fieldReview"> & {
  keyName: string;
  value: unknown;
  review?: string;
};
const REQUIRED_CONTEXT_FIELDS = ["name", "industry", "description", "products", "customers", "regions", "priorities"] as const;
const AI_REVIEW_CONTEXT_FIELDS = ["sub_industry", "competitors", "goals", "risks", "topics", "dependencies"] as const;
const SOURCE_MODES: SourceMode[] = ["pdf", "url", "text"];
const FIELD_GROUPS: ContextFieldGroup[] = [
  {
    id: "core",
    title: "Core company facts",
    description: "These facts must be present and confirmed before the context can become effective.",
    fields: [...REQUIRED_CONTEXT_FIELDS],
  },
  {
    id: "signals",
    title: "Leadership signals",
    description: "Review the signals the engine will use to interpret leadership relevance. If a fact is not disclosed, say so explicitly.",
    fields: [...AI_REVIEW_CONTEXT_FIELDS],
  },
];
const GENERATION_STAGES = [
  { id: "read", label: "Reading the source" },
  { id: "filter", label: "Filtering business information" },
  { id: "build", label: "Building company context" },
];
const GENERATION_PROGRESS = [24, 58, 82];
function hasFieldValue(value: unknown) { return Array.isArray(value) ? value.length > 0 : typeof value === "string" && value.trim().length > 0; }
function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
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
