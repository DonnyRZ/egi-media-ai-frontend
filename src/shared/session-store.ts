"use client";

import { create } from "zustand";

interface SessionState {
  accessToken: string | null;
  actor: { id: string; email: string; fullName: string; role: string; actorType: "human" } | null;
  permissions: string[];
  tenantId: string | null;
  activeCompanyId: string | null;
  isHydrated: boolean;
  hydrate: () => void;
  setAccessToken: (accessToken: string | null) => void;
  setAuthenticatedSession: (session: { accessToken: string; actor: { id: string; email: string; fullName: string; role: string; actorType: "human" }; permissions?: string[]; tenantId?: string | null; activeCompanyId?: string | null }) => void;
  setActiveCompanyId: (companyId: string | null) => void;
  setAuthorization: (authorization: { role: string | null; permissions: string[]; tenantId?: string | null; activeCompanyId?: string | null }) => void;
  hasPermission: (permission: string) => boolean;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  accessToken: null,
  actor: null,
  permissions: [],
  tenantId: null,
  activeCompanyId: null,
  isHydrated: false,
  hydrate: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("egi_media_ai_session");
      if (!raw) { set({ isHydrated: true }); return; }
      const session = JSON.parse(raw) as Pick<SessionState, "actor" | "tenantId" | "activeCompanyId" | "permissions"> & { authenticated?: boolean; accessToken?: string };
      // Only the non-secret session hint is persisted. Real bearer tokens stay in memory.
      if (session.authenticated !== true) { window.localStorage.removeItem("egi_media_ai_session"); set({ isHydrated: true }); return; }
      if (session.accessToken === "dummy-bearer-token-for-local-ui") { window.localStorage.removeItem("egi_media_ai_session"); set({ isHydrated: true }); return; }
      set({ accessToken: session.accessToken || null, actor: session.actor ?? null, permissions: session.permissions ?? [], tenantId: session.tenantId ?? null, activeCompanyId: session.activeCompanyId ?? null, isHydrated: true });
    } catch {
      window.localStorage.removeItem("egi_media_ai_session");
      set({ isHydrated: true });
    }
  },
  setAccessToken: (accessToken) => set({ accessToken }),
  setAuthenticatedSession: (session) => { if (typeof window !== "undefined") window.localStorage.setItem("egi_media_ai_session", JSON.stringify({ authenticated: true, accessToken: session.accessToken, actor: session.actor, permissions: session.permissions ?? [], tenantId: session.tenantId ?? null, activeCompanyId: session.activeCompanyId ?? null })); set({ ...session, permissions: session.permissions ?? [], tenantId: session.tenantId ?? null, activeCompanyId: session.activeCompanyId ?? null, isHydrated: true }); },
  setActiveCompanyId: (activeCompanyId) => set({ activeCompanyId }),
  setAuthorization: ({ role, permissions, tenantId, activeCompanyId }) => set((state) => ({ actor: state.actor ? { ...state.actor, role: role || state.actor.role } : state.actor, permissions, tenantId: tenantId === undefined ? state.tenantId : tenantId, activeCompanyId: activeCompanyId === undefined ? state.activeCompanyId : activeCompanyId })),
  hasPermission: (permission): boolean => get().permissions.includes(permission),
  clearSession: () => {
    if (typeof window !== "undefined") window.localStorage.removeItem("egi_media_ai_session");
    set({ accessToken: null, actor: null, permissions: [], tenantId: null, activeCompanyId: null, isHydrated: true });
  },
}));
