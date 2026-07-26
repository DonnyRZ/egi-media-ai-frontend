"use client";

import { create } from "zustand";
import type { CompanyOptionDto } from "@/shared/types/api.types";

type Actor = { id: string; email: string; fullName: string; role: string; actorType: "human" };

interface SessionState {
  accessToken: string | null;
  actor: Actor | null;
  permissions: string[];
  tenantId: string | null;
  activeCompanyId: string | null;
  authorizedCompanies: CompanyOptionDto[];
  isHydrated: boolean;
  hydrate: () => void;
  setAccessToken: (accessToken: string | null) => void;
  setAuthenticatedSession: (session: {
    accessToken: string;
    actor: Actor;
    permissions?: string[];
    tenantId?: string | null;
    activeCompanyId?: string | null;
    authorizedCompanies?: CompanyOptionDto[];
  }) => void;
  setActiveCompanyId: (companyId: string | null) => void;
  setAuthorizedCompanies: (companies: CompanyOptionDto[]) => void;
  setAuthorization: (authorization: {
    role: string | null;
    permissions: string[];
    tenantId?: string | null;
    activeCompanyId?: string | null;
    authorizedCompanies?: CompanyOptionDto[];
  }) => void;
  hasPermission: (permission: string) => boolean;
  clearSession: () => void;
}

const SESSION_KEY = "egi_media_ai_session";

type PersistedSession = {
  authenticated: true;
  accessToken: string | null;
  actor: Actor | null;
  permissions: string[];
  tenantId: string | null;
  activeCompanyId: string | null;
  authorizedCompanies: CompanyOptionDto[];
};

function normalizeCompanies(items: CompanyOptionDto[] | undefined | null): CompanyOptionDto[] {
  if (!Array.isArray(items)) return [];
  const map = new Map<string, CompanyOptionDto>();
  for (const item of items) {
    if (!item?.company_id) continue;
    const prev = map.get(item.company_id);
    map.set(item.company_id, {
      company_id: item.company_id,
      name: item.name ?? prev?.name ?? null,
      ...(item.tenant_id || prev?.tenant_id ? { tenant_id: item.tenant_id || prev?.tenant_id } : {}),
    });
  }
  return [...map.values()];
}

function writePersisted(next: Omit<PersistedSession, "authenticated">) {
  if (typeof window === "undefined" || !next.accessToken) return;
  const payload: PersistedSession = {
    authenticated: true,
    accessToken: next.accessToken,
    actor: next.actor,
    permissions: next.permissions,
    tenantId: next.tenantId,
    activeCompanyId: next.activeCompanyId,
    authorizedCompanies: next.authorizedCompanies,
  };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

export const useSessionStore = create<SessionState>((set, get) => ({
  accessToken: null,
  actor: null,
  permissions: [],
  tenantId: null,
  activeCompanyId: null,
  authorizedCompanies: [],
  isHydrated: false,
  hydrate: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (!raw) {
        set({ isHydrated: true });
        return;
      }
      const session = JSON.parse(raw) as Partial<PersistedSession> & { authenticated?: boolean };
      if (session.authenticated !== true) {
        window.localStorage.removeItem(SESSION_KEY);
        set({ isHydrated: true });
        return;
      }
      if (session.accessToken === "dummy-bearer-token-for-local-ui") {
        window.localStorage.removeItem(SESSION_KEY);
        set({ isHydrated: true });
        return;
      }
      set({
        accessToken: session.accessToken || null,
        actor: session.actor ?? null,
        permissions: session.permissions ?? [],
        tenantId: session.tenantId ?? null,
        activeCompanyId: session.activeCompanyId ?? null,
        authorizedCompanies: normalizeCompanies(session.authorizedCompanies),
        isHydrated: true,
      });
    } catch {
      window.localStorage.removeItem(SESSION_KEY);
      set({ isHydrated: true });
    }
  },
  setAccessToken: (accessToken) => {
    const state = get();
    writePersisted({
      accessToken,
      actor: state.actor,
      permissions: state.permissions,
      tenantId: state.tenantId,
      activeCompanyId: state.activeCompanyId,
      authorizedCompanies: state.authorizedCompanies,
    });
    set({ accessToken });
  },
  setAuthenticatedSession: (session) => {
    const next = {
      accessToken: session.accessToken,
      actor: session.actor,
      permissions: session.permissions ?? [],
      tenantId: session.tenantId ?? null,
      activeCompanyId: session.activeCompanyId ?? null,
      authorizedCompanies: normalizeCompanies(session.authorizedCompanies),
      isHydrated: true,
    };
    writePersisted(next);
    set(next);
  },
  setActiveCompanyId: (activeCompanyId) => {
    const state = get();
    writePersisted({
      accessToken: state.accessToken,
      actor: state.actor,
      permissions: state.permissions,
      tenantId: state.tenantId,
      activeCompanyId,
      authorizedCompanies: state.authorizedCompanies,
    });
    set({ activeCompanyId });
  },
  setAuthorizedCompanies: (companies) => {
    const authorizedCompanies = normalizeCompanies(companies);
    const state = get();
    writePersisted({
      accessToken: state.accessToken,
      actor: state.actor,
      permissions: state.permissions,
      tenantId: state.tenantId,
      activeCompanyId: state.activeCompanyId,
      authorizedCompanies,
    });
    set({ authorizedCompanies });
  },
  setAuthorization: ({ role, permissions, tenantId, activeCompanyId, authorizedCompanies }) =>
    set((state) => {
      const nextActor = state.actor ? { ...state.actor, role: role || state.actor.role } : state.actor;
      const nextTenantId = tenantId === undefined ? state.tenantId : tenantId;
      const nextCompanyId = activeCompanyId === undefined ? state.activeCompanyId : activeCompanyId;
      const nextCompanies =
        authorizedCompanies === undefined ? state.authorizedCompanies : normalizeCompanies(authorizedCompanies);
      writePersisted({
        accessToken: state.accessToken,
        actor: nextActor,
        permissions,
        tenantId: nextTenantId,
        activeCompanyId: nextCompanyId,
        authorizedCompanies: nextCompanies,
      });
      return {
        actor: nextActor,
        permissions,
        tenantId: nextTenantId,
        activeCompanyId: nextCompanyId,
        authorizedCompanies: nextCompanies,
      };
    }),
  hasPermission: (permission): boolean => get().permissions.includes(permission),
  clearSession: () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
    set({
      accessToken: null,
      actor: null,
      permissions: [],
      tenantId: null,
      activeCompanyId: null,
      authorizedCompanies: [],
      isHydrated: true,
    });
  },
}));
