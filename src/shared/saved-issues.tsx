"use client";

import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { useSessionStore } from "@/shared/session-store";
import { useUiStore } from "@/shared/ui-store";
import { savedError } from "@/shared/saved-issue-control";
import type { ApiSuccessResponse, SavedIssueListDto } from "@/shared/types/api.types";

async function readSaved() { const response = await axiosClient.get<ApiSuccessResponse<SavedIssueListDto>>(API_ENDPOINTS.savedIssues, { params: { page: 1, limit: 100 } }); return response.data.data; }
export function SavedIssues() {
  const companyId = useSessionStore((state) => state.activeCompanyId); const openIssue = useUiStore((state) => state.openIssue);
  const query = useQuery({ queryKey: ["saved-issues", companyId], queryFn: readSaved, enabled: Boolean(companyId), staleTime: 15_000 });
  if (query.isLoading) return <div className="issues-empty"><h2>Loading saved issues...</h2></div>;
  if (query.isError) return <div className="issues-empty"><h2>Saved issues unavailable</h2><p>{savedError(query.error)}</p><button className="context-action" onClick={() => query.refetch()}>Try again</button></div>;
  if (!query.data?.items.length) return <div className="issues-empty"><h2>No saved issues</h2><p>Save an issue from its detail drawer to keep it here.</p></div>;
  return <div className="issues-list">{query.data.items.map((item) => <article className="issue-list-card" role="button" tabIndex={0} key={item.saved_id} onClick={() => openIssue(item.issue_id)} onKeyDown={(event) => { if (event.key === "Enter") openIssue(item.issue_id); }}><div className="issue-list-copy"><h2>{item.issue.title}</h2><p>{item.issue.one_liner || "No one-liner available."}</p><div className="issue-list-meta"><span className={`priority-badge priority-${item.issue.priority ?? "rendah"}`}>{item.issue.priority ?? "unprioritized"}</span><span>Saved {new Date(item.saved_at).toLocaleDateString()}</span></div></div></article>)}</div>;
}
