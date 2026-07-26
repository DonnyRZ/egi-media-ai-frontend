"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import type { ApiSuccessResponse } from "@/shared/types/api.types";
import { useSessionStore } from "@/shared/session-store";
function key() { return `complete-${crypto.randomUUID()}`; }
type Detail = { status?: string; version?: number };
export function CompleteIssueControl({ issueId }: { issueId: string }) {
  const client = useQueryClient(); const query = useQuery({ queryKey: ["issue-detail-control", issueId], queryFn: async () => (await axiosClient.get<ApiSuccessResponse<Detail>>(API_ENDPOINTS.issueById(issueId))).data.data, staleTime: 15_000 });
  const allowed = useSessionStore((state) => state.permissions.includes("issue.complete"));
  const mutation = useMutation({ mutationFn: async () => (await axiosClient.post(API_ENDPOINTS.issueComplete(issueId), { version: query.data?.version }, { headers: { "Idempotency-Key": key() } })).data, onSuccess: () => { void client.invalidateQueries({ queryKey: ["issue-detail", issueId] }); void client.invalidateQueries({ queryKey: ["issue-detail-control", issueId] }); void client.invalidateQueries({ queryKey: ["issues"] }); } });
  if (!allowed || query.isLoading || query.data?.status === "selesai") return null;
  return <button className="source-preview-button" disabled={mutation.isPending || !Number.isInteger(query.data?.version)} onClick={() => mutation.mutate()}>{mutation.isPending ? "Completing..." : "Mark complete"}</button>;
}
