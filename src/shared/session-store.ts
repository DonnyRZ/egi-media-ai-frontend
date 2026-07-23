"use client";

import { create } from "zustand";

interface SessionState {
  accessToken: string | null;
  actor: { id: string; email: string; fullName: string; role: string; actorType: "human" } | null;
  tenantId: string | null;
  activeCompanyId: string | null;
  isHydrated: boolean;
  hydrate: () => void;
  startDummySession: () => void;
  setAccessToken: (accessToken: string | null) => void;
  setActiveCompanyId: (companyId: string | null) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  accessToken: null,
  actor: null,
  tenantId: null,
  activeCompanyId: null,
  isHydrated: false,
  hydrate: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("egi_media_ai_session");
      if (!raw) { set({ isHydrated: true }); return; }
      const session = JSON.parse(raw) as Pick<SessionState, "actor" | "tenantId" | "activeCompanyId"> & { authenticated?: boolean; accessToken?: string };
      // Only the non-secret session hint is persisted. Real bearer tokens stay in memory.
      if (session.authenticated !== true) { window.localStorage.removeItem("egi_media_ai_session"); set({ isHydrated: true }); return; }
      set({ accessToken: "dummy-bearer-token-for-local-ui", actor: session.actor ?? null, tenantId: session.tenantId ?? null, activeCompanyId: session.activeCompanyId ?? null, isHydrated: true });
    } catch {
      window.localStorage.removeItem("egi_media_ai_session");
      set({ isHydrated: true });
    }
  },
  startDummySession: () => {
    const session = {
      accessToken: "dummy-bearer-token-for-local-ui",
      actor: { id: "dummy-actor", email: "executive@example.com", fullName: "Executive User", role: "human_reviewer", actorType: "human" as const },
      tenantId: "dummy-tenant",
      activeCompanyId: "company-a",
    };
    if (typeof window !== "undefined") window.localStorage.setItem("egi_media_ai_session", JSON.stringify({ authenticated: true, actor: session.actor, tenantId: session.tenantId, activeCompanyId: session.activeCompanyId }));
    set({ ...session, isHydrated: true });
  },
  setAccessToken: (accessToken) => set({ accessToken }),
  setActiveCompanyId: (activeCompanyId) => set({ activeCompanyId }),
  clearSession: () => {
    if (typeof window !== "undefined") window.localStorage.removeItem("egi_media_ai_session");
    set({ accessToken: null, actor: null, tenantId: null, activeCompanyId: null, isHydrated: true });
  },
}));
