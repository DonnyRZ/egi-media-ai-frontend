"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
function key() { return `feedback-${crypto.randomUUID()}`; }
export function FeedbackForm({ targetType, targetId }: { targetType: "issue" | "report" | "analysis"; targetId: string }) {
  const [type, setType] = useState("helpful"); const [comment, setComment] = useState("");
  const mutation = useMutation({ mutationFn: () => axiosClient.post(API_ENDPOINTS.feedback, { target_type: targetType, target_id: targetId, type, comment: comment.trim() || undefined }, { headers: { "Idempotency-Key": key() } }) });
  if (mutation.isSuccess) return <p className="drawer-inline-empty">Feedback recorded. It will not change relevance or priority automatically.</p>;
  return <div className="feedback-form"><label htmlFor={`feedback-${targetId}`}>Feedback</label><select id={`feedback-${targetId}`} value={type} onChange={(event) => setType(event.target.value)}><option value="helpful">Helpful</option><option value="not_helpful">Not helpful</option><option value="incorrect">Incorrect</option><option value="missing_context">Missing context</option><option value="other">Other</option></select><textarea value={comment} maxLength={2000} onChange={(event) => setComment(event.target.value)} placeholder="Optional note" /><button className="context-action" onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? "Sending..." : "Send feedback"}</button>{mutation.isError && <p className="form-error">Feedback could not be sent. Please try again.</p>}</div>;
}
