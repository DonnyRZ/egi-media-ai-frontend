"use client";

import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  DEFAULT_COMPANY_LANGUAGE,
  resolveCompanyLanguage,
  type CompanyLanguage,
} from "@/shared/company-language";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { ScopeRequired } from "@/shared/prerequisite-gate";
import { useSessionStore } from "@/shared/session-store";
import type { ApiSuccessResponse, LanguagePreferenceDto } from "@/shared/types/api.types";
import { useWorkspaceScope } from "@/shared/workspace-scope";

function createIdempotencyKey() {
  return `language-preference-${crypto.randomUUID()}`;
}

async function readLanguagePreference(companyId: string) {
  const response = await axiosClient.get<ApiSuccessResponse<LanguagePreferenceDto>>(
    API_ENDPOINTS.languagePreferenceRead(companyId),
  );
  return response.data.data;
}

async function saveLanguagePreference(companyId: string, language: CompanyLanguage) {
  const response = await axiosClient.patch<ApiSuccessResponse<LanguagePreferenceDto>>(
    API_ENDPOINTS.languagePreference(companyId),
    { language },
    { headers: { "Idempotency-Key": createIdempotencyKey() } },
  );
  return response.data.data;
}

export function DisplayLanguage() {
  const scope = useWorkspaceScope();

  return (
    <ScopeRequired
      require="company"
      scope={scope}
      title="Company required for display language"
      reason="Display language preference is scoped to an active company. Select a company before choosing the language for newly generated AI output."
      nextStep="Pick a company in the header switcher. If none exist, provision one under Platform, then return here."
    >
      <DisplayLanguageBody />
    </ScopeRequired>
  );
}

function DisplayLanguageBody() {
  const companyId = useSessionStore((state) => state.activeCompanyId);
  const actor = useSessionStore((state) => state.actor);
  const queryClient = useQueryClient();
  const [language, setLanguage] = useState<CompanyLanguage>(DEFAULT_COMPANY_LANGUAGE);
  const [confirmed, setConfirmed] = useState<CompanyLanguage | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const preferenceQuery = useQuery({
    queryKey: ["language-preference", companyId],
    queryFn: () => readLanguagePreference(companyId as string),
    enabled: Boolean(companyId),
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (preferenceQuery.data) {
      const resolved = resolveCompanyLanguage(preferenceQuery.data.language);
      setLanguage(resolved);
      setConfirmed(resolved);
      // Keep success notices; only drop load/save errors once backend data confirms.
      setNotice((prev) => (prev?.kind === "error" ? null : prev));
    }
  }, [preferenceQuery.data]);

  useEffect(() => {
    if (preferenceQuery.isError) {
      setConfirmed(null);
      setNotice({ kind: "error", text: languagePreferenceError(preferenceQuery.error) });
    }
  }, [preferenceQuery.isError, preferenceQuery.error]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!companyId) throw new Error("Company scope is unavailable");
      return saveLanguagePreference(companyId, language);
    },
    onSuccess: (data) => {
      const resolved = resolveCompanyLanguage(data.language);
      setLanguage(resolved);
      setConfirmed(resolved);
      setNotice({ kind: "success", text: "Display language preference saved for this company." });
      void queryClient.setQueryData(["language-preference", companyId], data);
    },
    onError: (error) => setNotice({ kind: "error", text: languagePreferenceError(error) }),
  });

  const isDirty = confirmed === null || confirmed !== language;
  const loadFailed = preferenceQuery.isError;
  const loadPending = preferenceQuery.isPending || preferenceQuery.isFetching;

  return (
    <div className="preference-page">
      <div className="preference-heading">
        <p>
          Choose the language used for newly generated AI output. Existing drafts, issues, and reports are not
          rewritten.
        </p>
        <span className={`preference-state ${confirmed && !isDirty ? "is-confirmed" : "is-closed"}`}>
          <i />
          {confirmed && !isDirty ? "Backend confirmed" : "Fail-closed · not confirmed"}
        </span>
      </div>
      <div className="preference-scope">
        <span>Company scope</span>
        <strong>{companyId}</strong>
        <small>{actor?.email ?? "Current authenticated actor"}</small>
      </div>
      {loadFailed && (
        <div className="preference-notice error" role="alert" data-testid="display-language-load-error">
          {languagePreferenceError(preferenceQuery.error)}
          <button
            type="button"
            className="context-action"
            data-testid="display-language-retry"
            onClick={() => {
              setNotice(null);
              void preferenceQuery.refetch();
            }}
          >
            Retry
          </button>
        </div>
      )}
      <section className="preference-card">
        <label className="preference-field">
          <span>Display language</span>
          <select
            data-testid="display-language-select"
            value={language}
            disabled={loadPending || loadFailed || mutation.isPending}
            onChange={(event) => {
              setLanguage(resolveCompanyLanguage(event.target.value));
              setNotice(null);
            }}
          >
            <option value="id">Bahasa Indonesia</option>
            <option value="en">English</option>
          </select>
          <small>Applies to newly generated AI output for the active company only.</small>
        </label>
      </section>
      <div className="preference-footer">
        <div className="preference-failclosed">
          <strong>Fail-closed</strong>
          <span>
            Until the backend confirms a saved preference, the UI treats unset companies as Bahasa Indonesia by
            default.
          </span>
        </div>
        <button
          className="context-action"
          data-testid="display-language-save"
          disabled={mutation.isPending || !companyId || !isDirty || loadFailed || loadPending}
          onClick={() => {
            if (!companyId) return;
            mutation.mutate();
          }}
        >
          {mutation.isPending ? "Saving..." : "Save preference"}
        </button>
      </div>
      {notice && !loadFailed && (
        <div className={`preference-notice ${notice.kind}`} role="status">
          {notice.text}
        </div>
      )}
    </div>
  );
}

function languagePreferenceError(error: unknown) {
  if (error instanceof Error && !isAxiosError(error)) return error.message;
  if (isAxiosError<{ error?: { code?: string; message?: string } }>(error)) {
    const code = error.response?.data?.error?.code;
    if (code === "UNAUTHORIZED" || code === "FORBIDDEN") {
      return "Your session is not authorized for this company language preference.";
    }
    if (code === "VALIDATION_ERROR") {
      return error.response?.data?.error?.message ?? "Check the language selection and try again.";
    }
    if (code === "NOT_FOUND") {
      return "Company language preference was not found. Confirm the active company exists and try again.";
    }
    if (error.response?.status === 404) {
      return "Language preference API is unavailable. Restart the AI backend and refresh this page.";
    }
    return error.response?.data?.error?.message ?? "The backend could not confirm this language preference.";
  }
  return "The backend could not confirm this language preference.";
}
