"use client";

import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { useSessionStore } from "@/shared/session-store";
import type { ApiSuccessResponse } from "@/shared/types/api.types";

function key() { return `saved-issue-${crypto.randomUUID()}`; }
async function readSavedStatus(issueId: string) { const response = await axiosClient.get<ApiSuccessResponse<{ saved: boolean }>>(API_ENDPOINTS.issueSavedStatus(issueId)); return response.data.data; }
async function save(issueId: string) { const response = await axiosClient.post<ApiSuccessResponse<unknown>>(API_ENDPOINTS.issueSaved(issueId), {}, { headers: { "Idempotency-Key": key() } }); return response.data.data; }
async function unsave(issueId: string) { const response = await axiosClient.delete<ApiSuccessResponse<unknown>>(API_ENDPOINTS.issueSaved(issueId), { headers: { "Idempotency-Key": key() } }); return response.data.data; }

export function SavedIssueControl({ issueId }: { issueId: string }) {
  const companyId = useSessionStore((state) => state.activeCompanyId);
  const allowed = useSessionStore((state) => state.permissions.includes("issue.save"));
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["saved-issue-status", companyId, issueId], queryFn: () => readSavedStatus(issueId), enabled: Boolean(companyId && allowed && issueId), staleTime: 15_000, retry: 1 });
  const saved = query.data?.saved === true;
  const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(null);
  useEffect(() => setOptimisticSaved(null), [issueId, companyId]);
  const effectiveSaved = optimisticSaved ?? saved;
  const mutation = useMutation({
    mutationFn: () => effectiveSaved ? unsave(issueId) : save(issueId),
    onSuccess: () => {
      setOptimisticSaved(!effectiveSaved);
      void client.invalidateQueries({ queryKey: ["saved-issues", companyId] });
      void client.invalidateQueries({ queryKey: ["saved-issue-status", companyId, issueId] });
    },
  });
  if (!allowed) return null;
  return <><button className={`source-preview-button ${effectiveSaved ? "is-active" : ""}`} aria-pressed={effectiveSaved} aria-busy={mutation.isPending} data-loading={mutation.isPending} disabled={mutation.isPending || query.isLoading || query.isError} onClick={() => mutation.mutate()}>{mutation.isPending ? "Saving..." : effectiveSaved ? "Unsave issue" : "Save issue"}</button>{query.isError && <span className="drawer-action-error" role="alert">{savedError(query.error)}</span>}{mutation.isError && <span className="drawer-action-error" role="alert">{savedError(mutation.error)}</span>}</>;
}

export function savedError(error: unknown) { return isAxiosError<{ error?: { message?: string } }>(error) ? error.response?.data?.error?.message ?? "Saved issues could not be loaded." : "Saved issues could not be loaded."; }
