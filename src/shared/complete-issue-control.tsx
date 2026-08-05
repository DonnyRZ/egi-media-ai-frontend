"use client";
import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import type { ApiSuccessResponse } from "@/shared/types/api.types";
import { useSessionStore } from "@/shared/session-store";
function key() { return `complete-${crypto.randomUUID()}`; }
type Detail = { status?: string; version?: number };
function completeError(error: unknown) {
  if (isAxiosError<{ error?: { message?: string } }>(error)) return error.response?.data?.error?.message ?? "The issue could not be completed.";
  return error instanceof Error ? error.message : "The issue could not be completed.";
}
export function CompleteIssueControl({ issueId }: { issueId: string }) {
  const companyId = useSessionStore((state) => state.activeCompanyId);
  const allowed = useSessionStore((state) => state.permissions.includes("issue.complete"));
  const client = useQueryClient(); const query = useQuery({ queryKey: ["issue-detail-control", issueId], queryFn: async () => (await axiosClient.get<ApiSuccessResponse<Detail>>(API_ENDPOINTS.issueById(issueId))).data.data, enabled: Boolean(issueId && allowed), staleTime: 15_000 });
  const mutation = useMutation({ mutationFn: async () => (await axiosClient.post(API_ENDPOINTS.issueComplete(issueId), { version: query.data?.version }, { headers: { "Idempotency-Key": key(), "If-Match": String(query.data?.version) } })).data, onSuccess: () => { void client.invalidateQueries({ queryKey: ["issue-detail"] }); void client.invalidateQueries({ queryKey: ["issue-detail-control", issueId] }); void client.invalidateQueries({ queryKey: ["news-feed", companyId] }); void client.invalidateQueries({ queryKey: ["executive-summary", companyId] }); } });
  if (!allowed || query.isLoading || query.data?.status === "selesai") return null;
  return <><button className="source-preview-button" aria-busy={mutation.isPending} data-loading={mutation.isPending} disabled={mutation.isPending || !Number.isInteger(query.data?.version)} onClick={() => mutation.mutate()}>{mutation.isPending ? "Completing..." : "Mark complete"}</button>{mutation.isError && <span className="drawer-action-error" role="alert">{completeError(mutation.error)}</span>}</>;
}
