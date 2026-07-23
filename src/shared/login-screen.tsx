"use client";

import { FormEvent, useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { useSessionStore } from "@/shared/session-store";

export function LoginScreen() {
  const router = useRouter();
  const startDummySession = useSessionStore((state) => state.startDummySession);
  const [email, setEmail] = useState("executive@example.com");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim().includes("@")) { setError("Enter a valid email address."); return; }
    setError(null);
    setIsSubmitting(true);
    window.setTimeout(() => { startDummySession(); router.replace("/"); }, 280);
  }

  return <main className="login-screen"><section className="login-brand-panel"><div className="login-brand"><div className="brand-mark">E</div><div><strong>EGI Media</strong><span>AI Intelligence</span></div></div><div className="login-statement"><div className="eyebrow">Executive intelligence</div><h1>See the signal<br />before it becomes noise.</h1><p>A calm command center for the issues that shape your company.</p></div><div className="login-footer">AI-powered news intelligence · Local preview</div></section><section className="login-form-panel"><div className="login-form-wrap"><div className="mobile-login-mark"><div className="brand-mark">E</div><span>EGI Media AI</span></div><div className="eyebrow">Welcome back</div><h2>Enter your workspace.</h2><p className="login-description">Sign in to continue to your intelligence dashboard.</p><form onSubmit={handleSubmit} noValidate><label htmlFor="email">Work email</label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@company.com" aria-invalid={Boolean(error)} />{error && <span className="login-error" role="alert">{error}</span>}<button className="auth-primary-button login-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Preparing workspace..." : "Continue to workspace"}<span>→</span></button></form><div className="login-note"><span>i</span><p>Local preview mode. Authentication will connect to the backend bearer-token flow in a later sprint.</p></div></div></section></main>;
}
