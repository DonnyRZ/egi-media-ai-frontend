"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { axiosClient } from "@/shared/lib/axios-client";
import { API_ENDPOINTS } from "@/shared/constants/api.constants";

export function SignupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await axiosClient.post(API_ENDPOINTS.authSignup, { full_name: fullName, email, password });
      setDone(true);
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { error?: { message?: string } } } })?.response;
      setError(response?.data?.error?.message || "Account could not be created.");
    } finally {
      setPending(false);
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
          <div className="eyebrow">New workspace user</div>
          <h1>Start with<br />your signal.</h1>
          <p>Create an account, then accept a workspace invitation from your tenant administrator.</p>
        </div>
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="eyebrow">Create account</div>
          <h2>Join your workspace.</h2>
          {done ? (
            <>
              <p className="login-description">Account created. If a platform admin already invited this email, signup activated that membership — sign in and select your company in the switcher.</p>
              <button className="auth-primary-button login-submit" onClick={() => router.push("/login")}>
                Continue to sign in
                <span><ArrowRight size={16} strokeWidth={2} aria-hidden="true" /></span>
              </button>
            </>
          ) : (
            <form onSubmit={submit} noValidate>
              <label htmlFor="signup-name">Full name</label>
              <input id="signup-name" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required />
              <label htmlFor="signup-email">Work email</label>
              <input id="signup-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
              <label htmlFor="signup-password">Password</label>
              <div className="password-field">
                <input id="signup-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required />
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
              {error && <span className="login-error" role="alert">{error}</span>}
              <button className="auth-primary-button login-submit" type="submit" aria-busy={pending} data-loading={pending} disabled={pending}>
                {pending ? "Creating..." : "Create account"}
                <span><ArrowRight size={16} strokeWidth={2} aria-hidden="true" /></span>
              </button>
            </form>
          )}
          <button className="context-action" onClick={() => router.push("/login")}>Back to sign in</button>
        </div>
      </section>
    </main>
  );
}
