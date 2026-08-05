"use client";

import { isAxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Activity, AlertCircle, Bookmark, Clock, ExternalLink, FileText, Star, X, type LucideIcon } from "lucide-react";

import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { useSessionStore } from "@/shared/session-store";
import { useUiStore } from "@/shared/ui-store";
import { useFocusTrap } from "@/shared/focus-trap";
import type { ApiSuccessResponse } from "@/shared/types/api.types";
import { CompleteIssueControl } from "@/shared/complete-issue-control";
import { SavedIssueControl } from "@/shared/saved-issue-control";
import { BusyLabel, InlineLoading } from "@/shared/ux-state";
import { priorityLabel, statusLabel } from "@/shared/intelligence-labels";

type RecordValue = Record<string, unknown>;
type IssueDetail = { issueId: string; title: string; oneLiner: string | null; status: string; priority: "tinggi" | "sedang" | "rendah" | null; version: number; firstSeenAt: string; lastDevelopedAt: string | null; articles: Article[]; developments: Development[]; analysis: ValidatedAnalysis | null; priorityDecision: PriorityDecision | null };
type Source = { sourceArticleId: string; canonicalUrl: string | null; locale: string | null };
type Article = Source & { attachedAt: string | null };
type Development = { developmentId: string; developmentType: string; observedAt: string; issueArticleId: string | null };
type Citation = { sourceArticleId: string; canonicalUrl: string; locale: string | null; updatedAt: string | null };
type CitedItem = { text: string; sourceArticleIds: string[] };
type ValidatedAnalysis = { analysisId: string; status: string; contextVersion: number | null; validatedAt: string | null; gate: RecordValue; evidence: Citation[]; content: { whatHappened: string[]; whyMatters: string[]; impacts: CitedItem[]; risks: CitedItem[]; watch: CitedItem[]; claims: Array<CitedItem & { claimId: string }> } };
type PriorityDecision = { priority: "tinggi" | "sedang" | "rendah"; analysisId: string; contextVersion: number | null; effectiveAt: string | null };

async function fetchIssueDetail(issueId: string) {
  const response = await axiosClient.get<ApiSuccessResponse<unknown>>(API_ENDPOINTS.issueById(issueId));
  return normalizeIssueDetail(response.data.data);
}

export function IssueDetailDrawer() {
  const issueId = useUiStore((state) => state.openIssueId);
  const closeIssue = useUiStore((state) => state.closeIssue);
  const companyId = useSessionStore((state) => state.activeCompanyId);
  const canReadIssues = useSessionStore((state) => state.permissions.includes("issue.read"));
  const query = useQuery({ queryKey: ["issue-detail", companyId, issueId], queryFn: () => fetchIssueDetail(issueId as string), enabled: Boolean(issueId && companyId && canReadIssues), retry: 1, staleTime: 30_000 });
  const [previewSource, setPreviewSource] = useState<Source | null>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  useFocusTrap(drawerRef, Boolean(issueId && canReadIssues && !previewSource), closeIssue);
  useFocusTrap(previewRef, Boolean(previewSource), () => setPreviewSource(null));

  if (!issueId || !canReadIssues) return null;
  return <div className="issue-drawer-layer" role="presentation"><button className="issue-drawer-backdrop" onClick={closeIssue} aria-label="Close issue detail" /><aside ref={drawerRef} className="issue-detail-drawer" role="dialog" aria-modal="true" aria-label="Issue detail" aria-busy={query.isFetching}><header className="issue-drawer-header"><div><span className="drawer-eyebrow">Issue detail</span>{query.data && <h2>{query.data.title}</h2>}</div><button className="drawer-close" onClick={closeIssue} aria-label="Close issue detail"><X size={18} strokeWidth={2} aria-hidden="true" /></button></header>{query.isFetching && !query.isLoading && <div className="drawer-refreshing" role="status"><InlineLoading label="Refreshing issue..." /></div>}{query.isLoading ? <DrawerLoading /> : query.isError ? <DrawerError error={query.error} onRetry={() => query.refetch()} /> : query.data ? <><DrawerContent detail={query.data} onPreview={setPreviewSource} /><div className="issue-drawer-actions"><SavedIssueControl issueId={issueId} /><CompleteIssueControl issueId={issueId} /></div></> : <DrawerState title="No issue data" message="The backend returned an empty detail response." />}</aside>{previewSource && <SourcePreview source={previewSource} previewRef={previewRef} onClose={() => setPreviewSource(null)} />}</div>;
}

function DrawerContent({ detail, onPreview }: { detail: IssueDetail; onPreview: (source: Source) => void }) {
  return (
    <div className="issue-drawer-scroll">
      <div className="drawer-summary">
        <div className="badge-row drawer-summary-badges"><span className={`meta-tag meta-priority meta-priority-${detail.priority ?? "rendah"}`}>{priorityLabel(detail.priority)}</span><span className={`meta-tag meta-status meta-status-${detail.status}`}>{statusLabel(detail.status)}</span><span className="timestamp">Updated {formatDate(detail.lastDevelopedAt)}</span></div>
        <p>{detail.oneLiner || "No validated one-liner is available."}</p>
      </div>
      <DrawerSection title="Leadership analysis">{detail.analysis ? <AnalysisView analysis={detail.analysis} /> : <InlineEmpty text="No current validated analysis is available." />}</DrawerSection>
      <DrawerSection title="Priority decision">{detail.priorityDecision ? <div className="badge-row drawer-priority"><span className={`meta-tag meta-priority meta-priority-${detail.priorityDecision.priority}`}>{priorityLabel(detail.priorityDecision.priority)}</span><span className="timestamp">Effective {formatDate(detail.priorityDecision.effectiveAt)}</span></div> : <InlineEmpty text="No validated priority decision is available." />}</DrawerSection>
      <DrawerSection title="Evidence claims">{detail.analysis?.content.claims.length ? <div className="claim-list">{detail.analysis.content.claims.map((claim) => <div className="claim-item" key={claim.claimId}><p>{claim.text}</p><CitationRefs ids={claim.sourceArticleIds} citations={detail.analysis?.evidence ?? []} /></div>)}</div> : <InlineEmpty text="No validated claims are available." />}</DrawerSection>
      <DrawerSection title={`Source articles (${detail.articles.length})`}><ArticleList articles={detail.articles} onPreview={onPreview} /></DrawerSection>
      <DrawerSection title={`Citations (${detail.analysis?.evidence.length ?? 0})`}><CitationList citations={detail.analysis?.evidence ?? []} onPreview={onPreview} /></DrawerSection>
      <DrawerSection title="Issue history"><div className="drawer-meta-grid"><Meta label="Version" value={`v${detail.version}`} /><Meta label="First seen" value={formatDate(detail.firstSeenAt)} /><Meta label="Last developed" value={formatDate(detail.lastDevelopedAt)} /><Meta label="Priority version" value={detail.priorityDecision ? `v${detail.priorityDecision.contextVersion ?? "—"}` : "—"} /></div><div className="drawer-history-timeline"><Timeline developments={detail.developments} /></div></DrawerSection>
    </div>
  );
}

// Legacy ordering is retained below only as an audit reference while visual states are compared.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyDrawerContent({ detail, onPreview }: { detail: IssueDetail; onPreview: (source: Source) => void }) {
  return <div className="issue-drawer-scroll"><div className="drawer-summary"><div className="badge-row drawer-summary-badges"><span className={`meta-tag meta-priority meta-priority-${detail.priority ?? "rendah"}`}>{detail.priority ?? "unprioritized"}</span><span className={`meta-tag meta-status meta-status-${detail.status}`}>{detail.status}</span><span className="timestamp">Updated {formatDate(detail.lastDevelopedAt)}</span></div><p>{detail.oneLiner || "No validated one-liner is available."}</p></div><DrawerSection title="Version metadata"><div className="drawer-meta-grid"><Meta label="Version" value={`v${detail.version}`} /><Meta label="First seen" value={formatDate(detail.firstSeenAt)} /><Meta label="Last developed" value={formatDate(detail.lastDevelopedAt)} /><Meta label="Priority version" value={detail.priorityDecision ? `v${detail.priorityDecision.contextVersion ?? "—"}` : "—"} /></div></DrawerSection><DrawerSection title="Development timeline"><Timeline developments={detail.developments} /></DrawerSection><DrawerSection title="Validated analysis">{detail.analysis ? <AnalysisView analysis={detail.analysis} /> : <InlineEmpty text="No current validated analysis is available." />}</DrawerSection><DrawerSection title="Priority decision">{detail.priorityDecision ? <div className="badge-row drawer-priority"><span className={`meta-tag meta-priority meta-priority-${detail.priorityDecision.priority}`}>{detail.priorityDecision.priority}</span><span className="timestamp">Effective {formatDate(detail.priorityDecision.effectiveAt)}</span></div> : <InlineEmpty text="No validated priority decision is available." />}</DrawerSection><DrawerSection title="Claims">{detail.analysis?.content.claims.length ? <div className="claim-list">{detail.analysis.content.claims.map((claim) => <div className="claim-item" key={claim.claimId}><p>{claim.text}</p><CitationRefs ids={claim.sourceArticleIds} citations={detail.analysis?.evidence ?? []} /></div>)}</div> : <InlineEmpty text="No validated claims are available." />}</DrawerSection><DrawerSection title={`Articles (${detail.articles.length})`}><ArticleList articles={detail.articles} onPreview={onPreview} /></DrawerSection><DrawerSection title={`Citations (${detail.analysis?.evidence.length ?? 0})`}><CitationList citations={detail.analysis?.evidence ?? []} onPreview={onPreview} /></DrawerSection></div>;
}

function AnalysisView({ analysis }: { analysis: ValidatedAnalysis }) {
  const sections: Array<{ label: string; icon: LucideIcon; points: AnalysisPoint[] }> = [
    { label: "What happened", icon: FileText, points: analysis.content.whatHappened.map((text) => ({ text })) },
    { label: "Why it matters for the company", icon: Star, points: analysis.content.whyMatters.map((text) => ({ text })) },
    { label: "Impacts", icon: Activity, points: analysis.content.impacts },
    { label: "Risks", icon: AlertCircle, points: analysis.content.risks },
    { label: "What to watch", icon: Clock, points: analysis.content.watch },
  ];
  return (
    <div className="analysis-view">
      <div className="analysis-validity"><span /> Validated · citation gate passed · {formatDate(analysis.validatedAt)}</div>
      <div className="analysis-point-grid">
        {sections.map(({ label, icon: Icon, points }) => points.length > 0 && (
          <section className="analysis-block" key={label}>
            <header className="analysis-block-header"><span className="analysis-block-icon"><Icon size={15} strokeWidth={2} aria-hidden="true" /></span><div><h4>{label}</h4></div></header>
            <AnalysisPointList points={points} citations={analysis.evidence} />
          </section>
        ))}
      </div>
      <p className="analysis-note"><Bookmark size={14} strokeWidth={2} aria-hidden="true" /> Cited points are linked to the evidence trail below.</p>
    </div>
  );
}
type AnalysisPoint = { text: string; sourceArticleIds?: string[] };
function AnalysisPointList({ points, citations }: { points: AnalysisPoint[]; citations: Citation[] }) {
  const visible = points.slice(0, 3);
  const remaining = points.slice(3);
  const list = (items: AnalysisPoint[], offset = 0) => <ul className="analysis-points">{items.map((point, index) => <li key={`${point.text}-${offset + index}`}><span>{point.text}</span>{point.sourceArticleIds?.length ? <CitationRefs ids={point.sourceArticleIds} citations={citations} /> : null}</li>)}</ul>;
  return <div className="analysis-point-list">{list(visible)}{remaining.length > 0 && <details><summary>Show {remaining.length} more {remaining.length === 1 ? "point" : "points"}</summary>{list(remaining, 3)}</details>}</div>;
}

// Kept as a reference implementation while the compact analysis view is validated.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyAnalysisView({ analysis }: { analysis: ValidatedAnalysis }) {
  const sections: Array<[string, string[]]> = [
    ["What happened", analysis.content.whatHappened],
    ["Why it matters", analysis.content.whyMatters],
    ["Impacts", analysis.content.impacts.map((item) => item.text)],
    ["Risks", analysis.content.risks.map((item) => item.text)],
    ["Watch", analysis.content.watch.map((item) => item.text)],
  ];
  return (
    <div className="analysis-view">
      <div className="analysis-validity"><span /> Current · citation gate passed · {formatDate(analysis.validatedAt)}</div>
      {sections.map(([label, points]) => points.length > 0 && (
        <div className="analysis-block" key={label}>
          <span>{label}</span>
          <ul className="analysis-points">
            {points.map((point, index) => <li key={`${label}-${index}`}>{point}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}
function Timeline({ developments }: { developments: Development[] }) { return developments.length ? <div className="drawer-timeline">{developments.map((item) => <div className="timeline-item" key={item.developmentId}><span className="timeline-dot" /><div><strong>{item.developmentType}</strong><time>{formatDate(item.observedAt)}</time><small>Development ID {item.developmentId}</small></div></div>)}</div> : <InlineEmpty text="No development timeline is available." />; }
function ArticleList({ articles, onPreview }: { articles: Article[]; onPreview: (source: Source) => void }) { return articles.length ? <div className="drawer-link-list">{articles.map((article) => <SourceRow key={article.sourceArticleId} source={article} onPreview={onPreview} />)}</div> : <InlineEmpty text="No linked articles are available." />; }
function CitationList({ citations, onPreview }: { citations: Citation[]; onPreview: (source: Source) => void }) { return citations.length ? <div className="drawer-link-list">{citations.map((citation) => <SourceRow key={`${citation.sourceArticleId}-${citation.canonicalUrl}`} source={citation} onPreview={onPreview} />)}</div> : <InlineEmpty text="No validated citations are available." />; }
function SourceRow({ source, onPreview }: { source: Source; onPreview: (source: Source) => void }) { const available = Boolean(source.canonicalUrl && source.locale); return <div className="source-row">{available ? <a href={source.canonicalUrl as string} target="_blank" rel="noreferrer" className="source-link"><span>{source.locale}</span><strong>{source.sourceArticleId}</strong><em><ExternalLink size={13} strokeWidth={2} aria-hidden="true" /></em></a> : <div className="source-unavailable"><span>Unavailable</span><strong>{source.sourceArticleId}</strong><em>Canonical link unavailable</em></div>}<button className="source-preview-button" onClick={() => onPreview(source)}>Preview</button></div>; }
function SourcePreview({ source, previewRef, onClose }: { source: Source; previewRef: React.RefObject<HTMLElement | null>; onClose: () => void }) { const available = Boolean(source.canonicalUrl && source.locale); return <div className="source-preview-layer"><button className="source-preview-backdrop" onClick={onClose} aria-label="Close source preview" /><section ref={previewRef} className="source-preview-card" role="dialog" aria-modal="true" aria-label="Source preview"><button className="drawer-close" onClick={onClose} aria-label="Close source preview"><X size={18} strokeWidth={2} aria-hidden="true" /></button><div className="drawer-eyebrow">Source preview</div><h3>{source.sourceArticleId}</h3>{available ? <><span className="source-locale-badge">Locale · {source.locale}</span><p>This preview is limited to canonical source metadata supplied by the backend.</p><a className="context-action" href={source.canonicalUrl as string} target="_blank" rel="noreferrer">Open canonical article <ExternalLink size={14} strokeWidth={2} aria-hidden="true" /></a></> : <><span className="source-unavailable-badge">Source unavailable</span><p>The backend did not provide a valid locale-aware canonical URL for this source. No placeholder link was created.</p></>}</section></div>; }
function CitationRefs({ ids, citations }: { ids: string[]; citations: Citation[] }) { const validIds = new Set(citations.map((citation) => citation.sourceArticleId)); const visible = ids.filter((id) => validIds.has(id)); return visible.length ? <div className="citation-refs">{visible.map((id) => <span key={id}>Source {id.slice(0, 8)}</span>)}</div> : null; }
function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="drawer-section"><h3>{title}</h3>{children}</section>; }
function Meta({ label, value }: { label: string; value: string }) { return <div className="drawer-meta"><span>{label}</span><strong>{value}</strong></div>; }
function InlineEmpty({ text }: { text: string }) { return <p className="drawer-inline-empty">{text}</p>; }
function DrawerLoading() { return <div className="drawer-loading">{[1, 2, 3, 4, 5].map((item) => <span key={item} />)}</div>; }
function DrawerState({ title, message, action, onAction }: { title: string; message: string; action?: string; onAction?: () => void | Promise<unknown> }) {
  const [retrying, setRetrying] = useState(false);
  async function runAction() {
    if (!onAction || retrying) return;
    setRetrying(true);
    try {
      await onAction();
    } finally {
      setRetrying(false);
    }
  }
  return <div className="drawer-state"><h3>{title}</h3><p>{message}</p>{action && onAction && <button className="context-action" aria-busy={retrying} data-loading={retrying} disabled={retrying} onClick={() => void runAction()}>{retrying ? <BusyLabel>Retrying…</BusyLabel> : action}</button>}</div>;
}
function DrawerError({ error, onRetry }: { error: unknown; onRetry: () => void | Promise<unknown> }) { const message = isAxiosError<{ error?: { message?: string } }>(error) ? error.response?.data?.error?.message ?? "The issue detail could not be reached." : "The issue detail could not be loaded."; return <DrawerState title="Issue detail unavailable" message={message} action="Try again" onAction={onRetry} />; }

function isRecord(value: unknown): value is RecordValue { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function text(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : null; }
function url(value: unknown) { const candidate = text(value); if (!candidate) return null; try { const parsed = new URL(candidate); return ["http:", "https:"].includes(parsed.protocol) ? candidate : null; } catch { return null; } }
function normalizeIssueDetail(value: unknown): IssueDetail {
  if (!isRecord(value)) throw new Error("Backend returned an invalid issue detail shape");
  const issueId = text(value.issue_id); const title = text(value.title); const status = text(value.status); const firstSeenAt = text(value.first_seen_at); const version = value.version as number;
  if (!issueId || !title || !status || !Number.isInteger(version) || !firstSeenAt) throw new Error("Backend returned an invalid issue detail shape");
  const articles = Array.isArray(value.articles) ? value.articles.flatMap((item) => { if (!isRecord(item)) return []; const sourceArticleId = text(item.sourceArticleId ?? item.source_article_id); if (!sourceArticleId) return []; const canonicalUrl = url(item.canonicalUrl ?? item.canonical_url); return [{ sourceArticleId, canonicalUrl, locale: text(item.locale), attachedAt: text(item.attachedAt ?? item.attached_at) }]; }) : [];
  const developments = Array.isArray(value.developments) ? value.developments.flatMap((item) => { if (!isRecord(item)) return []; const developmentId = text(item.developmentId ?? item.development_id); const observedAt = text(item.observedAt ?? item.observed_at); return developmentId && observedAt ? [{ developmentId, developmentType: text(item.developmentType ?? item.development_type) ?? "development", observedAt, issueArticleId: text(item.issueArticleId ?? item.issue_article_id) }] : []; }) : [];
  const analysis = normalizeAnalysis(value.analysis);
  const priorityDecision = normalizePriority(value.priority, analysis);
  const priorityValue = ["tinggi", "sedang", "rendah"].includes(String(value.priority)) ? value.priority as IssueDetail["priority"] : priorityDecision?.priority ?? null;
  return { issueId, title, oneLiner: text(value.one_liner), status, priority: priorityValue, version, firstSeenAt, lastDevelopedAt: text(value.last_developed_at), articles, developments, analysis, priorityDecision };
}
function normalizeAnalysis(value: unknown): ValidatedAnalysis | null { if (!isRecord(value) || value.status !== "current" || !isRecord(value.gate) || !isRecord(value.analysis)) return null; const analysisId = text(value.analysisId); if (!analysisId) return null; const raw = value.analysis; const evidence = Array.isArray(value.evidence) ? value.evidence.flatMap((item) => { if (!isRecord(item)) return []; const sourceArticleId = text(item.sourceArticleId ?? item.source_article_id); const canonicalUrl = url(item.canonicalUrl ?? item.canonical_url); return sourceArticleId && canonicalUrl ? [{ sourceArticleId, canonicalUrl, locale: text(item.locale), updatedAt: text(item.updatedAt ?? item.updated_at) }] : []; }) : []; const validEvidence = new Set(evidence.map((item) => item.sourceArticleId)); const cited = (key: string) => Array.isArray(raw[key]) ? raw[key].flatMap((item) => { if (!isRecord(item) || !text(item.text) || !Array.isArray(item.source_article_ids)) return []; const sourceArticleIds = item.source_article_ids.filter((id): id is string => typeof id === "string" && validEvidence.has(id)); return sourceArticleIds.length === item.source_article_ids.length ? [{ text: text(item.text) as string, sourceArticleIds }] : []; }) : []; const claims = cited("claims").flatMap((item) => { const rawClaim = Array.isArray(raw.claims) ? raw.claims.find((candidate) => isRecord(candidate) && candidate.text === item.text && Array.isArray(candidate.source_article_ids) && candidate.source_article_ids.join("|") === item.sourceArticleIds.join("|")) : null; const claimId = isRecord(rawClaim) ? text(rawClaim.claim_id) : null; return claimId ? [{ ...item, claimId }] : []; }); const whatHappened = pointList(raw.what_happened); const whyMatters = pointList(raw.why_matters); if (!whatHappened.length || !whyMatters.length || !evidence.length || !claims.length) return null; return { analysisId, status: value.status, contextVersion: Number.isInteger(value.contextVersion) ? value.contextVersion as number : null, validatedAt: text(value.validatedAt), gate: value.gate, evidence, content: { whatHappened, whyMatters, impacts: cited("impacts"), risks: cited("risks"), watch: cited("watch"), claims } }; }
function pointList(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => { const point = text(item); return point ? [point] : []; });
  const legacy = text(value);
  return legacy ? [legacy] : [];
}
function normalizePriority(value: unknown, analysis: ValidatedAnalysis | null): PriorityDecision | null { if (!isRecord(value) || !analysis || value.analysisId !== analysis.analysisId || !["tinggi", "sedang", "rendah"].includes(String(value.priority))) return null; return { priority: value.priority as PriorityDecision["priority"], analysisId: value.analysisId as string, contextVersion: Number.isInteger(value.contextVersion) ? value.contextVersion as number : null, effectiveAt: text(value.effectiveAt) }; }
function formatDate(value: string | null) { if (!value) return "Not available"; const date = new Date(value); return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date); }
