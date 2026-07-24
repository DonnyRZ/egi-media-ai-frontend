"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { useSessionStore } from "@/shared/session-store";
import { useUiStore } from "@/shared/ui-store";
import type { ApiSuccessResponse, InboxEmailListDto, InboxEmailDto } from "@/shared/types/api.types";

async function readInbox() { const response = await axiosClient.get<ApiSuccessResponse<InboxEmailListDto>>(API_ENDPOINTS.inboxEmails, { params: { page: 1, limit: 50 } }); return response.data.data; }
async function markRead(emailId: string, read: boolean) { const response = await axiosClient.patch<ApiSuccessResponse<InboxEmailDto>>(API_ENDPOINTS.inboxEmailRead(emailId), { read }, { headers: { "Idempotency-Key": `inbox-read-${emailId}-${crypto.randomUUID()}` } }); return response.data.data; }
export function AlertsInbox() {
  const companyId = useSessionStore((state) => state.activeCompanyId); const openIssue = useUiStore((state) => state.openIssue); const client = useQueryClient();
  const query = useQuery({ queryKey: ["inbox-emails", companyId], queryFn: readInbox, enabled: Boolean(companyId), staleTime: 10_000 });
  const mutation = useMutation({ mutationFn: ({ id, read }: { id: string; read: boolean }) => markRead(id, read), onSuccess: () => client.invalidateQueries({ queryKey: ["inbox-emails", companyId] }) });
  if (query.isLoading) return <div className="issues-empty"><h2>Loading alerts...</h2></div>;
  if (query.isError) return <div className="issues-empty"><h2>Alerts unavailable</h2><p>The backend inbox could not be loaded.</p><button className="context-action" onClick={() => query.refetch()}>Try again</button></div>;
  if (!query.data?.items.length) return <div className="issues-empty"><h2>No archived alerts</h2><p>Validated alert deliveries will appear here.</p></div>;
  return <div className="issues-list">{query.data.items.map((email) => <article className={`issue-list-card ${email.read ? "" : "is-unread"}`} key={email.email_id}><div className="issue-list-copy"><div className="issue-list-meta"><span className="status-badge status-berkembang">{email.channel}</span><span>{new Date(email.created_at).toLocaleString()}</span></div><h2>{email.issue_id || "Alert event"}</h2><p>{email.reason_code || email.status}</p><div className="context-flow-actions">{email.issue_id && <button className="source-preview-button" onClick={() => openIssue(email.issue_id as string)}>Open issue</button>}<button className="source-preview-button" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: email.email_id, read: !email.read })}>{email.read ? "Mark unread" : "Mark read"}</button></div></div></article>)}</div>;
}
