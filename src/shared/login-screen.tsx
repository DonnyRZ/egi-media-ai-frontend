"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { ArrowRight, Eye, EyeOff, Info } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useSessionStore } from "@/shared/session-store";
import { axiosClient } from "@/shared/lib/axios-client";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import type { ApiSuccessResponse, LoginDto } from "@/shared/types/api.types";
import { toCompanyOptionsFromLogin } from "@/shared/company-options";

/** Soft App Router replace can stall after auth writes; hard assign is deterministic for login. */
function goToWorkspaceHome() {
  const locale = window.location.pathname.split("/").filter(Boolean)[0] || "id";
  window.location.assign(`${window.location.origin}/${locale}`);
}

export function LoginScreen() {
  const router = useRouter();
  const accessToken = useSessionStore((state) => state.accessToken);
  const isHydrated = useSessionStore((state) => state.isHydrated);
  const hydrate = useSessionStore((state) => state.hydrate);
  const setAuthenticatedSession = useSessionStore((state) => state.setAuthenticatedSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const leaveLoginRef = useRef(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Leave /login when a session already exists (refresh, stalled soft-nav, etc.).
  useEffect(() => {
    if (!isHydrated || !accessToken || isSubmitting || leaveLoginRef.current) return;
    leaveLoginRef.current = true;
    goToWorkspaceHome();
  }, [accessToken, isHydrated, isSubmitting]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim().includes("@") || !password) {
      setError("Enter your email and password.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await axiosClient.post<ApiSuccessResponse<LoginDto>>(API_ENDPOINTS.authLogin, { email, password });
      const data = response.data.data;
      const actor = data.actor;
      setAuthenticatedSession({
        accessToken: data.access_token,
        actor: {
          id: actor.id,
          email: actor.email,
          fullName: actor.email,
          role: actor.role || "customer_user",
          actorType: "human",
        },
        permissions: data.permissions ?? [],
        tenantId: data.tenant_id ?? null,
        activeCompanyId: data.company_id ?? null,
        authorizedCompanies: toCompanyOptionsFromLogin(data.authorized_companies),
      });
      leaveLoginRef.current = true;
      goToWorkspaceHome();
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        setError("Email or password is invalid.");
      } else if (isAxiosError(err) && !err.response) {
        setError("Cannot reach the sign-in service. Check that the API is running.");
      } else {
        setError("Sign in failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-brand-panel">
        <div className="login-brand">
          <div className="brand-mark">E</div>
          <div>
            <strong>EGI Media</strong>
            <span>AI News Insight</span>
          </div>
        </div>
        <div className="login-statement">
          <div className="eyebrow">Executive intelligence</div>
          <h1>
            See the signal
            <br />
            before it becomes noise.
          </h1>
          <p>Sign in to access intelligence workspaces once tenant and company scope are ready.</p>
        </div>
        <div className="login-footer">AI-powered news intelligence · Secure access</div>
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="mobile-login-mark">
            <div className="brand-mark">E</div>
            <span>EGI Media AI</span>
          </div>
          <div className="eyebrow">Welcome back</div>
          <h2>Sign in to continue.</h2>
          <p className="login-description">Company-scoped data appears after tenant membership and an active company are set.</p>
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="email">Work email</label>
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@company.com" aria-invalid={Boolean(error)} />
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Your password"
                aria-invalid={Boolean(error)}
              />
              <button
                type="button"
                className="password-toggle-button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={18} strokeWidth={2} aria-hidden="true" /> : <Eye size={18} strokeWidth={2} aria-hidden="true" />}
              </button>
            </div>
            {error && (
              <span className="login-error" role="alert">
                {error}
              </span>
            )}
            <div className="login-actions">
              <button className="auth-primary-button login-submit" type="submit" aria-busy={isSubmitting} data-loading={isSubmitting} disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Continue to workspace"}
                <span><ArrowRight size={16} strokeWidth={2} aria-hidden="true" /></span>
              </button>
              <button className="login-secondary-button" type="button" onClick={() => router.push("/signup")}>
                Create a new account
              </button>
            </div>
          </form>
          <div className="login-note">
            <span><Info size={12} strokeWidth={2} aria-hidden="true" /></span>
            <p>Workspace access is controlled by tenant membership. Signup alone does not grant company data access.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
