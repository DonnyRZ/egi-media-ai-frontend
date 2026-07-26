"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { ScopeRequired } from "@/shared/prerequisite-gate";
import { useSessionStore } from "@/shared/session-store";
import { useUiStore } from "@/shared/ui-store";
import { useWorkspaceScope } from "@/shared/workspace-scope";
import type { ApiSuccessResponse, InboxEmailListDto, InboxEmailDto } from "@/shared/types/api.types";

async function readInbox() {
  const response = await axiosClient.get<ApiSuccessResponse<InboxEmailListDto>>(API_ENDPOINTS.inboxEmails, { params: { page: 1, limit: 50 } });
  return response.data.data;
}
async function markRead(emailId: string, read: boolean) {
  const response = await axiosClient.patch<ApiSuccessResponse<InboxEmailDto>>(
    API_ENDPOINTS.inboxEmailRead(emailId),
    { read },
    { headers: { "Idempotency-Key": `inbox-read-${emailId}-${crypto.randomUUID()}` } },
  );
  return response.data.data;
}

export function AlertsInbox() {
  const scope = useWorkspaceScope();

  return (
    <ScopeRequired
      require="company"
      scope={scope}
      title="Company scope required for alerts"
      reason="Alert deliveries are company-scoped. Without an active company, “no archived alerts” would misread as zero deliveries for a customer."
      nextStep="Pick a company in the header switcher. If none exist, provision one under Platform, then return here."
    >
      <AlertsInboxBody />
    </ScopeRequired>
  );
}

function AlertsInboxBody() {
  const companyId = useSessionStore((state) => state.activeCompanyId);
  const openIssue = useUiStore((state) => state.openIssue);
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["inbox-emails", companyId], queryFn: readInbox, enabled: Boolean(companyId), staleTime: 10_000 });
  const mutation = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) => markRead(id, read),
    onSuccess: () => client.invalidateQueries({ queryKey: ["inbox-emails", companyId] }),
  });

  return (
    <div className="issues-page">
      <div className="issues-heading">
        <div>
          <div className="eyebrow">Delivery archive</div>
          <h1>Alerts</h1>
          <p>Validated alert delivery events for the active company.</p>
        </div>
      </div>
      {query.isLoading ? (
        <div className="issues-empty">
          <h2>Loading alerts...</h2>
        </div>
      ) : query.isError ? (
        <div className="issues-empty">
          <h2>Alerts unavailable</h2>
          <p>The backend inbox could not be loaded.</p>
          <button className="context-action" onClick={() => query.refetch()}>
            Try again
          </button>
        </div>
      ) : !query.data?.items.length ? (
        <div className="issues-empty">
          <h2>No archived alerts</h2>
          <p>Validated alert deliveries will appear here.</p>
        </div>
      ) : (
        <div className="issues-list">
          {query.data.items.map((email) => (
            <article className={`issue-list-card ${email.read ? "" : "is-unread"}`} key={email.email_id}>
              <div className="issue-list-copy">
                <div className="issue-list-meta">
                  <span className="status-badge status-berkembang">{email.channel}</span>
                  <span>{new Date(email.created_at).toLocaleString()}</span>
                </div>
                <h2>{email.issue_id || "Alert event"}</h2>
                <p>{email.reason_code || email.status}</p>
                <div className="context-flow-actions">
                  {email.issue_id && (
                    <button className="source-preview-button" onClick={() => openIssue(email.issue_id as string)}>
                      Open issue
                    </button>
                  )}
                  <button
                    className="source-preview-button"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ id: email.email_id, read: !email.read })}
                  >
                    {email.read ? "Mark unread" : "Mark read"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
