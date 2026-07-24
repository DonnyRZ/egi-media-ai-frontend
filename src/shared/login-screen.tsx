"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSessionStore } from "@/shared/session-store";
import { axiosClient } from "@/shared/lib/axios-client";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import type { ApiSuccessResponse, LoginDto } from "@/shared/types/api.types";

export function LoginScreen() {
  const router = useRouter();
  const setAuthenticatedSession = useSessionStore((state) => state.setAuthenticatedSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!email.trim().includes("@") || !password) { setError("Enter your email and password."); return; } setError(null); setIsSubmitting(true); try { const response = await axiosClient.post<ApiSuccessResponse<LoginDto>>(API_ENDPOINTS.authLogin, { email, password }); const data = response.data.data; const actor = data.actor; setAuthenticatedSession({ accessToken: data.access_token, actor: { id: actor.id, email: actor.email, fullName: actor.email, role: actor.role || "customer_user", actorType: actor.type === "human" ? "human" : "human" }, tenantId: data.tenant_id ?? null, activeCompanyId: data.company_id ?? null }); router.replace("/"); } catch { setError("Email or password is invalid."); } finally { setIsSubmitting(false); } }
  return <main className="login-screen"><section className="login-brand-panel"><div className="login-brand"><div className="brand-mark">E</div><div><strong>EGI Media</strong><span>AI Intelligence</span></div></div><div className="login-statement"><div className="eyebrow">Executive intelligence</div><h1>See the signal<br />before it becomes noise.</h1><p>A calm command center for the issues that shape your company.</p></div><div className="login-footer">AI-powered news intelligence · Secure access</div></section><section className="login-form-panel"><div className="login-form-wrap"><div className="mobile-login-mark"><div className="brand-mark">E</div><span>EGI Media AI</span></div><div className="eyebrow">Welcome back</div><h2>Enter your workspace.</h2><p className="login-description">Sign in to continue to your intelligence dashboard.</p><form onSubmit={handleSubmit} noValidate><label htmlFor="email">Work email</label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@company.com" aria-invalid={Boolean(error)} /><label htmlFor="password">Password</label><input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Your password" aria-invalid={Boolean(error)} />{error && <span className="login-error" role="alert">{error}</span>}<button className="auth-primary-button login-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Signing in..." : "Continue to workspace"}<span>→</span></button></form><button className="context-action" onClick={() => router.push("/signup")}>Create a new account</button><div className="login-note"><span>i</span><p>Workspace access is controlled by tenant membership. Signup alone does not grant company data access.</p></div></div></section></main>;
}
