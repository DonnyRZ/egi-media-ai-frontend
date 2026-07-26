"use client";

import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { ScopeRequired } from "@/shared/prerequisite-gate";
import { useSessionStore } from "@/shared/session-store";
import { useUiStore } from "@/shared/ui-store";
import { savedError } from "@/shared/saved-issue-control";
import { useWorkspaceScope } from "@/shared/workspace-scope";
import type { ApiSuccessResponse, SavedIssueListDto } from "@/shared/types/api.types";

async function readSaved() {
  const response = await axiosClient.get<ApiSuccessResponse<SavedIssueListDto>>(API_ENDPOINTS.savedIssues, { params: { page: 1, limit: 100 } });
  return response.data.data;
}

export function SavedIssues() {
  const scope = useWorkspaceScope();

  return (
    <ScopeRequired
      require="company"
      scope={scope}
      title="Company scope required for saved issues"
      reason="Saved bookmarks are company-scoped. Without an active company, “no saved issues” would look like an empty personal list — that is not the case here."
      nextStep="Pick a company in the header switcher. If none exist, provision one under Platform, then return here."
    >
      <SavedIssuesBody />
    </ScopeRequired>
  );
}

function SavedIssuesBody() {
  const companyId = useSessionStore((state) => state.activeCompanyId);
  const openIssue = useUiStore((state) => state.openIssue);
  const query = useQuery({ queryKey: ["saved-issues", companyId], queryFn: readSaved, enabled: Boolean(companyId), staleTime: 15_000 });

  return (
    <div className="issues-page">
      <div className="issues-heading">
        <div>
          <div className="eyebrow">Personal workspace</div>
          <h1>Saved Issues</h1>
          <p>Your company-scoped issue bookmarks.</p>
        </div>
      </div>
      {query.isLoading ? (
        <div className="issues-empty">
          <h2>Loading saved issues...</h2>
        </div>
      ) : query.isError ? (
        <div className="issues-empty">
          <h2>Saved issues unavailable</h2>
          <p>{savedError(query.error)}</p>
          <button className="context-action" onClick={() => query.refetch()}>
            Try again
          </button>
        </div>
      ) : !query.data?.items.length ? (
        <div className="issues-empty">
          <h2>No saved issues</h2>
          <p>Save an issue from its detail drawer to keep it here.</p>
        </div>
      ) : (
        <div className="issues-list">
          {query.data.items.map((item) => (
            <article
              className="issue-list-card"
              role="button"
              tabIndex={0}
              key={item.saved_id}
              onClick={() => openIssue(item.issue_id)}
              onKeyDown={(event) => {
                if (event.key === "Enter") openIssue(item.issue_id);
              }}
            >
              <div className="issue-list-copy">
                <h2>{item.issue.title}</h2>
                <p>{item.issue.one_liner || "No one-liner available."}</p>
                <div className="issue-list-meta">
                  <span className={`priority-badge priority-${item.issue.priority ?? "rendah"}`}>{item.issue.priority ?? "unprioritized"}</span>
                  <span>Saved {new Date(item.saved_at).toLocaleDateString()}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
