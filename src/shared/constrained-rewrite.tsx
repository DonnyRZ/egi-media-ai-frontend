"use client";

import { isAxiosError } from "axios";
import { useEffect, useRef, useState } from "react";

import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { useSessionStore } from "@/shared/session-store";

interface RewriteResponse {
  narrative: { report_narrative_id: string; version: number; narrative: unknown };
  rewritten_span: { span_id: string; source_claim_ids: string[] };
}

export interface ConstrainedRewriteProps {
  reportId: string;
  narrativeId: string;
  version: number;
  spanId: string;
  currentText: string;
  approvedSourceClaimIds: string[];
  onApplied?: (result: RewriteResponse) => void;
}

export function ConstrainedRewritePanel(props: ConstrainedRewriteProps) {
  const canRewrite = useSessionStore((state) => state.permissions.includes("report.rewrite"));
  const [instruction, setInstruction] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [result, setResult] = useState<RewriteResponse | null>(null);
  const [error, setError] = useState<RewriteUiError | null>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const canPreview = Boolean(props.spanId && props.currentText.trim() && instruction.trim() && instruction.length <= 1000);
  useEffect(() => {
    if (result) successRef.current?.scrollIntoView({ block: "nearest" });
  }, [result]);
  if (!canRewrite) return null;

  function preview() { if (!canPreview) { setError({ code: "VALIDATION_ERROR", message: "Select a valid span and enter an instruction up to 1000 characters.", conflict: false }); return; } setError(null); setResult(null); setIsPreviewing(true); }
  async function apply() { setIsApplying(true); setError(null); try { const data = await applyConstrainedRewrite(props, instruction); setResult(data); setIsPreviewing(false); props.onApplied?.(data); } catch (caught) { setError(toRewriteError(caught)); } finally { setIsApplying(false); } }

  return <section className="rewrite-panel"><div className="rewrite-panel-heading"><div><span className="context-label">Human-only edit</span><h2>Constrained rewrite</h2></div><span className="preference-readonly">Citation set locked</span></div><div className="rewrite-span"><span>Selected span</span><blockquote>{props.currentText}</blockquote></div><label className="preference-field"><span>Bounded instruction</span><textarea value={instruction} onChange={(event) => { setInstruction(event.target.value); setError(null); }} maxLength={1000} placeholder="Example: Make this sentence more concise without adding facts." /><small>{instruction.length}/1000 · The instruction is sent only after preview confirmation.</small></label>{isPreviewing && <div className="rewrite-preview"><span className="drawer-eyebrow">Preview before apply</span><h3>Review the requested change</h3><p><strong>Span:</strong> {props.currentText}</p><p><strong>Instruction:</strong> {instruction}</p><small>AI output is not applied until you confirm. The backend preserves the existing citation set.</small><div className="rewrite-preview-actions"><button className="source-preview-button" onClick={() => setIsPreviewing(false)}>Edit instruction</button><button className="context-action" aria-busy={isApplying} data-loading={isApplying} disabled={isApplying} onClick={apply}>{isApplying ? "Applying..." : "Apply rewrite"}</button></div></div>}{result && <div ref={successRef} className="rewrite-success" role="status"><strong>Rewrite applied at version {result.narrative.version}.</strong><span>Citation set preserved: {result.rewritten_span.source_claim_ids.length} approved source claims.</span></div>}{error && <div className={`rewrite-error ${error.conflict ? "is-conflict" : ""}`} role="alert"><strong>{error.conflict ? "Version conflict" : "Rewrite unavailable"}</strong><span>{error.message}</span>{error.conflict && <small>Reload the report narrative before trying again.</small>}</div>} {!isPreviewing && !result && <button className="context-action" disabled={!canPreview} onClick={preview}>Preview rewrite</button>}</section>;
}

async function applyConstrainedRewrite(props: ConstrainedRewriteProps, instruction: string) {
  const actor = useSessionStore.getState().actor;
  if (!actor || actor.actorType !== "human") throw Object.assign(new Error("Constrained rewrite requires a human actor"), { code: "HUMAN_ACTOR_REQUIRED" });
  if (!props.reportId.trim() || !props.narrativeId.trim() || !props.spanId.trim() || !Number.isInteger(props.version) || props.version < 1) throw Object.assign(new Error("A report, narrative, span, and current version are required"), { code: "VALIDATION_ERROR" });
  const response = await axiosClient.post<{ success: true; data: RewriteResponse }>(API_ENDPOINTS.reportNarrativeRewrite(props.reportId, props.narrativeId), { allowed_span_id: props.spanId, instruction, version: props.version }, { headers: { "If-Match": String(props.version), "Idempotency-Key": `report-rewrite-${props.reportId}-${props.narrativeId}-${props.version}-${crypto.randomUUID()}` } });
  const returnedIds = response.data.data.rewritten_span.source_claim_ids;
  const approved = new Set(props.approvedSourceClaimIds);
  if (!Array.isArray(returnedIds) || returnedIds.some((id) => !approved.has(id)) || returnedIds.length !== approved.size) throw Object.assign(new Error("Backend returned a changed citation set; rewrite was rejected"), { code: "CITATION_SET_CHANGED" });
  return response.data.data;
}

interface RewriteUiError { code: string; message: string; conflict: boolean; }
function toRewriteError(error: unknown): RewriteUiError { if (isAxiosError<{ error?: { code?: string; message?: string } }>(error)) { const code = error.response?.data?.error?.code ?? "REWRITE_ERROR"; return { code, message: error.response?.data?.error?.message ?? "The rewrite could not be applied.", conflict: code === "VERSION_CONFLICT" }; } if (error instanceof Error) return { code: typeof (error as Error & { code?: unknown }).code === "string" ? (error as Error & { code: string }).code : "REWRITE_ERROR", message: error.message, conflict: false }; return { code: "REWRITE_ERROR", message: "The rewrite could not be applied.", conflict: false }; }
