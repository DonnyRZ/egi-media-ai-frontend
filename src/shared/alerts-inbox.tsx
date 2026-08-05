"use client";

import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowRight, Bell, CheckCircle2, Clock3, X } from "lucide-react";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { useFocusTrap } from "@/shared/focus-trap";
import { ScopeRequired } from "@/shared/prerequisite-gate";
import { useSessionStore } from "@/shared/session-store";
import { useUiStore } from "@/shared/ui-store";
import { useWorkspaceScope } from "@/shared/workspace-scope";
import { alertChannelLabel, alertStatusLabel, humanizeToken } from "@/shared/intelligence-labels";
import type { ApiSuccessResponse, InboxEmailDto, InboxEmailListDto } from "@/shared/types/api.types";
import { BusyLabel, CollectionEmptyState, CollectionLoading, CollectionPagination } from "@/shared/ux-state";

type AlertChannel = "langsung" | "ringkasan";

const ALERTS_PAGE_SIZE = 20;
const ALERT_TABS: Array<{ value: AlertChannel; label: string; description: string }> = [
  { value: "langsung", label: "Urgent alerts", description: "High-priority developments that need attention." },
  { value: "ringkasan", label: "Daily digest", description: "Company developments grouped for the day." },
];

async function readInbox(page: number, channel: AlertChannel) {
  const response = await axiosClient.get<ApiSuccessResponse<InboxEmailListDto>>(API_ENDPOINTS.inboxEmails, { params: { page, limit: ALERTS_PAGE_SIZE, channel } });
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

function alertActionError(error: unknown) {
  if (isAxiosError<{ error?: { message?: string } }>(error)) {
    return error.response?.data?.error?.message ?? "The alert could not be updated. Try again.";
  }
  return error instanceof Error && error.message ? error.message : "The alert could not be updated. Try again.";
}

export function AlertsInbox() {
  const scope = useWorkspaceScope();

  return (
    <ScopeRequired
      require="company"
      scope={scope}
      title="Company scope required for alerts"
      reason="Alert deliveries are company-scoped. Without an active company, the inbox cannot show a trustworthy delivery history."
      nextStep="Select a company in the header switcher, then return here."
    >
      <AlertsInboxBody />
    </ScopeRequired>
  );
}

function AlertsInboxBody() {
  const companyId = useSessionStore((state) => state.activeCompanyId);
  const openIssue = useUiStore((state) => state.openIssue);
  const client = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [channel, setChannel] = useState<AlertChannel>("langsung");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<InboxEmailDto | null>(null);
  useEffect(() => {
    setPage(1);
    setSelected(null);
  }, [companyId, channel]);
  const query = useQuery({ queryKey: ["inbox-emails", companyId, channel, page], queryFn: () => readInbox(page, channel), enabled: Boolean(companyId), staleTime: 10_000, retry: 1 });
  const mutation = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) => markRead(id, read),
    onSuccess: (updated) => {
      setNotice(null);
      setSelected((current) => current?.email_id === updated.email_id ? updated : current);
      return client.invalidateQueries({ queryKey: ["inbox-emails", companyId] });
    },
    onError: (error) => setNotice(alertActionError(error)),
  });

  const openAlert = (email: InboxEmailDto) => {
    setNotice(null);
    setSelected(email);
    if (!email.read) mutation.mutate({ id: email.email_id, read: true });
  };

  return (
    <div className="issues-page alerts-page" aria-busy={query.isFetching}>
      <div className="page-context alerts-page-context">
        <div className="alert-tabs" role="tablist" aria-label="Alert type">
          {ALERT_TABS.map((tab) => {
            const active = channel === tab.value;
            const unread = query.data?.meta.unread_by_channel?.[tab.value] ?? 0;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`alert-panel-${tab.value}`}
                className={`alert-tab${active ? " is-active" : ""}`}
                onClick={() => setChannel(tab.value)}
              >
                <span>{tab.label}</span>
                {unread > 0 && <span className="alert-tab-count" aria-label={`${unread} unread`}>{unread}</span>}
              </button>
            );
          })}
        </div>
        <span className="supporting-text">Open a delivery to read the grounded brief and follow it to the related issue.</span>
      </div>
      {notice && <div className="preference-notice error" role="alert">{notice}</div>}
      {query.isFetching && !query.isLoading && <div className="collection-refresh-status" role="status"><BusyLabel>Updating alerts...</BusyLabel></div>}
      {query.isLoading ? (
        <CollectionLoading label="Loading alerts..." rows={4} />
      ) : query.isError ? (
        <CollectionEmptyState icon={AlertCircle} tone="error" title="Alerts unavailable" message="The backend inbox could not be loaded.">
          <button
            className="context-action"
            aria-busy={query.isFetching}
            data-loading={query.isFetching}
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {query.isFetching ? <BusyLabel>Retrying...</BusyLabel> : "Try again"}
          </button>
        </CollectionEmptyState>
      ) : !query.data?.items.length ? (
        <CollectionEmptyState icon={Bell} title={`No ${channel === "langsung" ? "urgent alerts" : "daily digest deliveries"} yet`} message={ALERT_TABS.find((tab) => tab.value === channel)?.description ?? "Validated alert deliveries will appear here."} />
      ) : (
        <div id={`alert-panel-${channel}`} role="tabpanel" aria-label={ALERT_TABS.find((tab) => tab.value === channel)?.label} className="issues-list alert-list">
          {query.data.items.map((email) => (
            <article className={`alert-list-card ${email.read ? "" : "is-unread"}`} key={email.email_id}>
              <span className="alert-unread-indicator" aria-hidden="true" />
              <div className="alert-list-copy">
                <button type="button" className="alert-card-main" onClick={() => openAlert(email)}>
                  <div className="alert-card-top">
                    <div className="alert-card-labels">
                      <span className="alert-channel-label">{alertChannelLabel(email.channel)}</span>
                      <span className={`alert-delivery-status alert-delivery-${email.status}`}>
                        {(email.status === "delivered" || email.status === "sent") && <CheckCircle2 size={13} strokeWidth={2} aria-hidden="true" />}
                        {alertStatusLabel(email.status)}
                      </span>
                    </div>
                    <time dateTime={email.created_at}><Clock3 size={13} strokeWidth={2} aria-hidden="true" />{formatAlertDate(email.created_at)}</time>
                  </div>
                  <div className="alert-card-heading">
                    <h2>{channel === "langsung" ? "Urgent alert" : "Daily digest"}</h2>
                    <span className={`alert-read-state ${email.read ? "is-read" : "is-unread"}`}>{email.read ? "Read" : "Unread"}</span>
                  </div>
                  <p>{alertPreview(email)}</p>
                  {email.alert_content && <span className="alert-grounding">Grounded brief · {email.alert_content.source_claim_ids.length} validated claim{email.alert_content.source_claim_ids.length === 1 ? "" : "s"}</span>}
                </button>
                <div className="alert-card-actions">
                  {email.issue_id && <button type="button" className="source-preview-button" onClick={() => openIssue(email.issue_id as string)}>Open issue <ArrowRight size={14} strokeWidth={2} aria-hidden="true" /></button>}
                  <button
                    type="button"
                    className="source-preview-button"
                    aria-busy={mutation.isPending && mutation.variables?.id === email.email_id}
                    data-loading={mutation.isPending && mutation.variables?.id === email.email_id}
                    disabled={mutation.isPending && mutation.variables?.id === email.email_id}
                    onClick={() => {
                      setNotice(null);
                      mutation.mutate({ id: email.email_id, read: !email.read });
                    }}
                  >
                    {mutation.isPending && mutation.variables?.id === email.email_id ? <BusyLabel>{email.read ? "Marking unread..." : "Marking read..."}</BusyLabel> : email.read ? "Mark unread" : "Mark read"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {query.data && <CollectionPagination page={page} total={query.data.meta.total} limit={query.data.meta.limit || ALERTS_PAGE_SIZE} onPageChange={setPage} isFetching={query.isFetching} label="alerts" />}
      {selected && <AlertDetailDialog email={selected} onClose={() => setSelected(null)} onOpenIssue={openIssue} />}
    </div>
  );
}

function AlertDetailDialog({ email, onClose, onOpenIssue }: { email: InboxEmailDto; onClose: () => void; onOpenIssue: (issueId: string) => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  useFocusTrap(dialogRef, true, onClose);
  const content = email.alert_content;
  return (
    <div className="source-preview-layer">
      <button className="source-preview-backdrop" onClick={onClose} aria-label="Close alert detail" />
      <section ref={dialogRef} className="source-preview-card alert-detail-card" role="dialog" aria-label="Alert detail" aria-modal="true">
        <button className="drawer-close" onClick={onClose} aria-label="Close alert detail"><X size={18} strokeWidth={2} aria-hidden="true" /></button>
        <header className="alert-detail-header">
          <div className="drawer-eyebrow">{alertChannelLabel(email.channel)}</div>
          <h2>{email.issue_id ? "Company issue alert" : "Alert delivery"}</h2>
          <p>{formatAlertDate(email.created_at)}</p>
          <div className="badge-row issue-list-meta"><span className={`meta-tag alert-delivery-${email.status}`}>{alertStatusLabel(email.status)}</span><span className="meta-tag">{email.read ? "Read" : "Unread"}</span></div>
        </header>
        <div className="alert-detail-body">
          {content ? (
            <>
              {content.new_development && <section className="alert-detail-section"><h3>New development</h3><p>{content.new_development}</p></section>}
              {content.short_impact && <section className="alert-detail-section"><h3>Why it matters</h3><p>{content.short_impact}</p></section>}
              <p className="alert-grounding alert-detail-grounding">Grounded in {content.source_claim_ids.length} validated claim{content.source_claim_ids.length === 1 ? "" : "s"}.</p>
            </>
          ) : (
            <section className="alert-detail-empty"><Bell size={20} strokeWidth={1.8} aria-hidden="true" /><h3>Brief not available</h3><p>The delivery event is recorded, but no generated brief is available for this alert yet.</p></section>
          )}
          <section className="alert-detail-section alert-detail-meta-section"><h3>Delivery details</h3><dl className="alert-detail-meta-grid"><div><dt>Channel</dt><dd>{alertChannelLabel(email.channel)}</dd></div><div><dt>Reason</dt><dd>{email.reason_code ? humanizeToken(email.reason_code) : "Not specified"}</dd></div><div><dt>Issue</dt><dd>{email.issue_id || "Not linked"}</dd></div><div><dt>Development</dt><dd>{email.development_id || "Not linked"}</dd></div></dl></section>
        </div>
        {email.issue_id && <footer className="alert-detail-actions"><button type="button" className="context-action" onClick={() => onOpenIssue(email.issue_id as string)}>Open issue <ArrowRight size={15} strokeWidth={2} aria-hidden="true" /></button></footer>}
      </section>
    </div>
  );
}

function alertPreview(email: InboxEmailDto) {
  return email.alert_content?.new_development || email.alert_content?.short_impact || (email.reason_code ? humanizeToken(email.reason_code) : "A validated alert delivery was recorded for this company.");
}

function formatAlertDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
