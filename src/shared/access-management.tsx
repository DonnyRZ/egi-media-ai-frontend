"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "@/shared/lib/axios-client";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import type { ApiSuccessResponse, MembershipListDto } from "@/shared/types/api.types";
import { PermissionGate } from "@/shared/permission-guard";

const roles = ["tenant_admin", "company_admin", "executive", "analyst", "viewer"];
const key = () => `access-${Date.now()}-${Math.random().toString(36).slice(2)}`.padEnd(16, "0");

export function AccessManagement() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState(""); const [role, setRole] = useState("analyst"); const [companyId, setCompanyId] = useState(""); const [message, setMessage] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["tenant-memberships"], queryFn: async () => (await axiosClient.get<ApiSuccessResponse<MembershipListDto>>(API_ENDPOINTS.tenantMemberships)).data.data, retry: false });
  const invite = useMutation({ mutationFn: async () => (await axiosClient.post(API_ENDPOINTS.tenantMemberships, { email, role, company_id: companyId || null }, { headers: { "Idempotency-Key": key() } })).data, onSuccess: () => { setEmail(""); setMessage("Access invitation saved."); queryClient.invalidateQueries({ queryKey: ["tenant-memberships"] }); }, onError: () => setMessage("Access could not be saved.") });
  const revoke = useMutation({ mutationFn: async (item: { membership_id: string; version: number }) => axiosClient.delete(API_ENDPOINTS.tenantMembership(item.membership_id), { headers: { "Idempotency-Key": key(), "If-Match": String(item.version) } }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-memberships"] }), onError: () => setMessage("Access could not be revoked.") });
  return <PermissionGate permission="tenant.users.manage" fallback={<div className="standard-state standard-state-forbidden"><h2>Access restricted</h2><p>Your role cannot manage tenant memberships.</p></div>}><div className="settings-hub access-page"><div className="eyebrow">Tenant administration</div><h1>Access control</h1><p>Manage who can access this customer workspace and which intelligence role they receive.</p><section className="access-invite-card"><div><strong>Invite or assign access</strong><span>Roles are enforced by the backend and scoped to this tenant.</span></div><div className="access-form"><input aria-label="Work email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@company.com" /><select aria-label="Role" value={role} onChange={(event) => setRole(event.target.value)}>{roles.map((item) => <option key={item} value={item}>{item}</option>)}</select><input aria-label="Company ID" value={companyId} onChange={(event) => setCompanyId(event.target.value)} placeholder="Company ID (optional)" /><button className="context-action" disabled={!email.includes("@") || invite.isPending} onClick={() => invite.mutate()}>{invite.isPending ? "Saving..." : "Grant access"}</button></div>{message && <small role="status">{message}</small>}</section><section className="access-list-card"><div className="section-heading"><div><div className="eyebrow">Memberships</div><h2>Workspace access</h2></div><span>{query.data?.meta.total ?? 0} members</span></div>{query.isLoading && <p>Loading memberships...</p>}{query.error && <p role="alert">Memberships are unavailable.</p>}{query.data?.items.map((item) => <div className="access-row" key={item.membership_id}><div><strong>{item.user_id}</strong><span>{item.company_id || "All companies"} · {item.role}</span></div><div><span className={`context-status-badge ${item.status !== "active" ? "is-inactive" : ""}`}>{item.status}</span>{item.status === "active" && <button className="source-preview-button" onClick={() => revoke.mutate(item)}>Revoke</button>}</div></div>)}</section></div></PermissionGate>;
}
