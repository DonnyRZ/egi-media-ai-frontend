"use client";

import { isAxiosError } from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import { useSessionStore } from "@/shared/session-store";
import type { AlertPreferenceDto, ApiSuccessResponse } from "@/shared/types/api.types";

type QuietHours = { start: string; end: string } | null;
type PreferenceForm = Omit<AlertPreferenceDto, "quiet_hours"> & { quiet_hours: QuietHours; quiet_hours_enabled: boolean };

function defaultTimezone() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta"; } catch { return "Asia/Jakarta"; } }
function createIdempotencyKey() { return `alert-preference-${crypto.randomUUID()}`; }

async function savePreference(companyId: string, form: PreferenceForm) {
  const { quiet_hours_enabled, ...payload } = form;
  const response = await axiosClient.put<ApiSuccessResponse<AlertPreferenceDto>>(API_ENDPOINTS.alertPreference(companyId), { ...payload, quiet_hours: quiet_hours_enabled ? payload.quiet_hours : null }, { headers: { "Idempotency-Key": createIdempotencyKey() } });
  return response.data.data;
}
async function readPreference(companyId: string) { const response = await axiosClient.get<ApiSuccessResponse<AlertPreferenceDto>>(API_ENDPOINTS.alertPreferenceRead(companyId)); return response.data.data; }

export function AlertPreferences() {
  const companyId = useSessionStore((state) => state.activeCompanyId);
  const actor = useSessionStore((state) => state.actor);
  const [form, setForm] = useState<PreferenceForm>({ recipient_id: "", direct_high_enabled: false, daily_digest_enabled: false, timezone: defaultTimezone(), quiet_hours: { start: "22:00", end: "07:00" }, quiet_hours_enabled: false });
  const [confirmed, setConfirmed] = useState<AlertPreferenceDto | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const preferenceQuery = useQuery({ queryKey: ["alert-preference", companyId], queryFn: () => readPreference(companyId as string), enabled: Boolean(companyId), retry: false, staleTime: 30_000 });
  useEffect(() => { if (preferenceQuery.data) { setForm((current) => ({ ...current, ...preferenceQuery.data, quiet_hours_enabled: Boolean(preferenceQuery.data.quiet_hours) })); setConfirmed(preferenceQuery.data); } }, [preferenceQuery.data]);
  const mutation = useMutation({ mutationFn: () => { if (!companyId) throw new Error("Company scope is unavailable"); if (!form.recipient_id.trim()) throw new Error("Recipient reference is required"); return savePreference(companyId, form); }, onSuccess: (data) => { setConfirmed(data); setNotice({ kind: "success", text: "Preference confirmed by backend. Email delivery remains backend-controlled." }); }, onError: (error) => setNotice({ kind: "error", text: preferenceError(error) }) });
  const isDirty = !confirmed || JSON.stringify(confirmed) !== JSON.stringify(toPayload(form));

  function update<K extends keyof PreferenceForm>(key: K, value: PreferenceForm[K]) { setForm((current) => ({ ...current, [key]: value })); setNotice(null); }
  function updateQuiet(key: "start" | "end", value: string) { setForm((current) => ({ ...current, quiet_hours: { ...(current.quiet_hours ?? { start: "22:00", end: "07:00" }), [key]: value } })); setNotice(null); }

  return <div className="preference-page"><div className="preference-heading"><div><div className="eyebrow">Alert controls</div><h1>Alert preferences</h1><p>Choose how the backend may evaluate direct high alerts and daily digest eligibility.</p></div><span className={`preference-state ${confirmed && !isDirty ? "is-confirmed" : "is-closed"}`}><i />{confirmed && !isDirty ? "Backend confirmed" : "Fail-closed · not confirmed"}</span></div><div className="preference-scope"><span>Company scope</span><strong>{companyId ?? "Unavailable"}</strong><small>{actor?.email ?? "Current authenticated actor"}</small></div><section className="preference-card"><PreferenceToggle title="High alert" description="Allow backend rules to evaluate eligible high-priority developments for direct alert delivery." checked={form.direct_high_enabled} onChange={(value) => update("direct_high_enabled", value)} /><PreferenceToggle title="Daily digest" description="Allow eligible alert events to be included in a backend-generated daily digest." checked={form.daily_digest_enabled} onChange={(value) => update("daily_digest_enabled", value)} /></section><section className="preference-card"><div className="preference-section-title"><div><span className="context-label">Delivery context</span><h2>When should the backend evaluate?</h2></div><span className="preference-readonly">Backend rules</span></div><label className="preference-field"><span>Recipient reference</span><input value={form.recipient_id} onChange={(event) => update("recipient_id", event.target.value)} placeholder="Backend recipient ID" /><small>Use the recipient reference known by the backend. This field is not an email recipient override.</small></label><label className="preference-field"><span>Timezone</span><select value={form.timezone} onChange={(event) => update("timezone", event.target.value)}><option value="Asia/Jakarta">Asia/Jakarta</option><option value="Asia/Singapore">Asia/Singapore</option><option value="Asia/Tashkent">Asia/Tashkent</option><option value="UTC">UTC</option></select></label><div className="quiet-hours-row"><div><span className="preference-field-label">Quiet hours</span><p>Suppress eligible alert evaluation during this local time window.</p></div><button className={`toggle ${form.quiet_hours_enabled ? "is-on" : ""}`} role="switch" aria-checked={form.quiet_hours_enabled} onClick={() => update("quiet_hours_enabled", !form.quiet_hours_enabled)}><span /></button></div>{form.quiet_hours_enabled && <div className="quiet-hours-inputs"><label className="preference-field"><span>Start</span><input type="time" value={form.quiet_hours?.start ?? "22:00"} onChange={(event) => updateQuiet("start", event.target.value)} /></label><label className="preference-field"><span>End</span><input type="time" value={form.quiet_hours?.end ?? "07:00"} onChange={(event) => updateQuiet("end", event.target.value)} /></label></div>}</section><div className="preference-footer"><div className="preference-failclosed"><strong>Fail-closed</strong><span>Local toggle changes do not send or authorize email. Until backend confirmation succeeds, the UI treats the preference as inactive.</span></div><button className="context-action" disabled={mutation.isPending || !companyId || !form.recipient_id.trim()} onClick={() => mutation.mutate()}>{mutation.isPending ? "Saving..." : "Save preferences"}</button></div>{notice && <div className={`preference-notice ${notice.kind}`} role="status">{notice.text}</div>}</div>;
}

function PreferenceToggle({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (value: boolean) => void }) { return <div className="preference-toggle-row"><div><h2>{title}</h2><p>{description}</p></div><button className={`toggle ${checked ? "is-on" : ""}`} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}><span /></button></div>; }
function toPayload(form: PreferenceForm): AlertPreferenceDto { return { recipient_id: form.recipient_id, direct_high_enabled: form.direct_high_enabled, daily_digest_enabled: form.daily_digest_enabled, timezone: form.timezone, quiet_hours: form.quiet_hours_enabled ? form.quiet_hours : null }; }
function preferenceError(error: unknown) { if (error instanceof Error && !isAxiosError(error)) return error.message; if (isAxiosError<{ error?: { code?: string; message?: string } }>(error)) { const code = error.response?.data?.error?.code; if (code === "UNAUTHORIZED" || code === "FORBIDDEN") return "Your session is not authorized for this company preference."; if (code === "VALIDATION_ERROR") return error.response?.data?.error?.message ?? "Check the preference fields and try again."; return error.response?.data?.error?.message ?? "The backend could not confirm this preference."; } return "The backend could not confirm this preference."; }
