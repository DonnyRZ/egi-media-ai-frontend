import { isAxiosError } from "axios";

import type { NewsFeedChannelId } from "@/shared/news-feed-channels";

export type TenantStatus = "pending" | "active" | "suspended" | "archived";
export type Tenant = {
  tenant_id: string;
  name: string;
  status: TenantStatus;
  legal_name?: string | null;
  timezone?: string;
  default_locale?: string;
  metadata?: { allowed_news_channel_ids?: NewsFeedChannelId[] };
  allowed_news_channel_ids?: NewsFeedChannelId[];
  created_at?: string;
  updated_at?: string;
};
export type Company = { company_id: string; name: string | null; status?: string };
export type Membership = {
  membership_id: string;
  user_id: string;
  role: string;
  status: string;
  company_id?: string | null;
  email?: string | null;
  full_name?: string | null;
};
export type LifecycleAction = "activate" | "suspend" | "resume" | "archive" | "restore";
export type StatusFilter = TenantStatus | "all";

export const STATUS_META: Record<TenantStatus, { label: string; description: string }> = {
  pending: { label: "Pending setup", description: "Finish setup before making this workspace operational." },
  active: { label: "Active", description: "Customer access and provisioning are available." },
  suspended: { label: "Suspended", description: "Customer access and intake are paused; data is retained." },
  archived: { label: "Archived", description: "The workspace is retained for audit and recovery." },
};

export const LIFECYCLE_ACTIONS: Record<TenantStatus, LifecycleAction[]> = {
  pending: ["activate", "archive"],
  active: ["suspend"],
  suspended: ["resume", "archive"],
  archived: ["restore"],
};

export const ACTION_TARGET_STATUS: Record<LifecycleAction, TenantStatus> = {
  activate: "active",
  suspend: "suspended",
  resume: "active",
  archive: "archived",
  restore: "active",
};

export const ACTION_META: Record<
  LifecycleAction,
  { label: string; title: string; description: string; requiresReason: boolean; intent: "primary" | "danger" }
> = {
  activate: {
    label: "Activate workspace",
    title: "Activate this workspace?",
    description: "Customer access and eligible provisioning will be available once the workspace is active.",
    requiresReason: false,
    intent: "primary",
  },
  suspend: {
    label: "Suspend workspace",
    title: "Suspend this workspace?",
    description: "Customer sign-in and intake will pause. Workspace data and audit history will be retained.",
    requiresReason: true,
    intent: "danger",
  },
  resume: {
    label: "Resume workspace",
    title: "Resume this workspace?",
    description: "Customer access and eligible intake can resume when the workspace becomes active.",
    requiresReason: false,
    intent: "primary",
  },
  archive: {
    label: "Archive workspace",
    title: "Archive this workspace?",
    description: "The workspace will leave active operations and remain retained for audit and recovery.",
    requiresReason: true,
    intent: "danger",
  },
  restore: {
    label: "Restore workspace",
    title: "Restore this workspace?",
    description: "The workspace will return to active operations. Verify its company and owner setup before handoff.",
    requiresReason: false,
    intent: "primary",
  },
};

export function isTenantStatus(value: unknown): value is TenantStatus {
  return value === "pending" || value === "active" || value === "suspended" || value === "archived";
}

export function normalizeTenant(item: Tenant): Tenant {
  return { ...item, status: isTenantStatus(item.status) ? item.status : "pending" };
}

export function formatDate(value?: string) {
  if (!value) return "No update recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function errorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ error?: { message?: string } }>(error)) return error.response?.data?.error?.message || fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function idempotencyKey() {
  return crypto.randomUUID();
}

export function membershipEmail(membership: Membership): string {
  if (membership.email) return membership.email;
  const match = /^user:(.+)$/.exec(membership.user_id);
  return match ? match[1] : membership.user_id;
}
