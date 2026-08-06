"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertCircle, Bookmark } from "lucide-react";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { ScopeRequired } from "@/shared/prerequisite-gate";
import { useSessionStore } from "@/shared/session-store";
import { useUiStore } from "@/shared/ui-store";
import { savedError } from "@/shared/saved-issue-control";
import { useWorkspaceScope } from "@/shared/workspace-scope";
import type { ApiSuccessResponse, SavedIssueDto, SavedIssueListDto } from "@/shared/types/api.types";
import { BusyLabel, CollectionEmptyState, CollectionLoading, CollectionPagination } from "@/shared/ux-state";

const SAVED_ISSUES_PAGE_SIZE = 20;

async function readSaved(page: number) {
  const response = await axiosClient.get<ApiSuccessResponse<SavedIssueListDto>>(API_ENDPOINTS.savedIssues, { params: { page, limit: SAVED_ISSUES_PAGE_SIZE } });
  return response.data.data;
}

async function removeSaved(issueId: string) {
  const response = await axiosClient.delete<ApiSuccessResponse<unknown>>(API_ENDPOINTS.issueSaved(issueId), { headers: { "Idempotency-Key": `saved-remove-${issueId}-${crypto.randomUUID()}` } });
  return response.data.data;
}

function formatSavedAt(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
}

function priorityLabel(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object" && typeof (value as { priority?: unknown }).priority === "string") {
    const nested = (value as { priority: string }).priority.trim();
    if (nested) return nested;
  }
  return "unprioritized";
}

function isRenderableSavedIssue(item: SavedIssueDto | null | undefined): item is SavedIssueDto {
  return Boolean(item?.issue_id && item.issue?.issue_id && typeof item.issue?.title === "string" && item.issue.title);
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
  const canManageSaved = useSessionStore((state) => state.permissions.includes("issue.save"));
  const client = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [companyId]);
  const query = useQuery({
    queryKey: ["saved-issues", companyId, page],
    queryFn: () => readSaved(page),
    enabled: Boolean(companyId),
    staleTime: 15_000,
    retry: 1,
    placeholderData: keepPreviousData,
  });
  const removeMutation = useMutation({
    mutationFn: removeSaved,
    onSuccess: () => {
      setNotice("Issue removed from saved.");
      void client.invalidateQueries({ queryKey: ["saved-issues", companyId] });
    },
    onError: (error) => setNotice(savedError(error)),
  });
  const items = Array.isArray(query.data?.items) ? query.data.items.filter(isRenderableSavedIssue) : [];

  return (
    <div className="issues-page" aria-busy={query.isFetching}>
      <div className="page-context">
        <span className="supporting-text">Your company-scoped issue bookmarks.</span>
      </div>
      {notice && (
        <div className={`preference-notice ${removeMutation.isError ? "error" : "success"}`} role={removeMutation.isError ? "alert" : "status"}>
          {notice}
        </div>
      )}
      {query.isFetching && !query.isLoading && (
        <div className="collection-refresh-status" role="status">
          <BusyLabel>Updating saved issues...</BusyLabel>
        </div>
      )}
      {query.isLoading ? (
        <CollectionLoading label="Loading saved issues..." rows={4} />
      ) : query.isError ? (
        <CollectionEmptyState icon={AlertCircle} tone="error" title="Saved issues unavailable" message={savedError(query.error)}>
          <button
            className="context-action"
            aria-busy={query.isFetching}
            data-loading={query.isFetching}
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {query.isFetching ? <BusyLabel>Retrying…</BusyLabel> : "Try again"}
          </button>
        </CollectionEmptyState>
      ) : !items.length ? (
        <CollectionEmptyState icon={Bookmark} title="No saved issues" message="Save an issue from its detail drawer to keep it here." />
      ) : (
        <div className="issues-list">
          {items.map((item) => {
            const savedOn = formatSavedAt(item.saved_at);
            return (
              <article className="saved-list-row" key={item.saved_id || item.issue_id}>
                <button type="button" className="saved-list-main" onClick={() => openIssue(item.issue_id)}>
                  <span className="saved-list-kicker">Saved issue</span>
                  <div className="issue-list-copy">
                    <h2>{item.issue?.title ?? "Untitled issue"}</h2>
                    <p>{item.issue?.one_liner || "No one-liner available."}</p>
                    <div className="badge-row issue-list-meta">
                      <span className={`meta-tag meta-priority meta-priority-${priorityLabel(item.issue?.priority)}`}>
                        {priorityLabel(item.issue?.priority)}
                      </span>
                    </div>
                  </div>
                </button>
                <div className="saved-list-side">
                  {savedOn ? <span className="timestamp">Saved {savedOn}</span> : <span className="timestamp">Saved</span>}
                  {canManageSaved && (
                    <button
                      type="button"
                      className="source-preview-button"
                      aria-busy={removeMutation.isPending && removeMutation.variables === item.issue_id}
                      data-loading={removeMutation.isPending && removeMutation.variables === item.issue_id}
                      disabled={removeMutation.isPending}
                      onClick={() => {
                        setNotice(null);
                        removeMutation.mutate(item.issue_id);
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {query.data?.meta && (
        <CollectionPagination
          page={page}
          total={query.data.meta.total ?? 0}
          limit={query.data.meta.limit || SAVED_ISSUES_PAGE_SIZE}
          onPageChange={setPage}
          isFetching={query.isFetching}
          label="saved issues"
        />
      )}
    </div>
  );
}
