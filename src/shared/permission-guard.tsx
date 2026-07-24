"use client";

import type { ReactNode } from "react";
import { useSessionStore } from "@/shared/session-store";

export function PermissionGate({ permission, children, fallback = null }: { permission: string; children: ReactNode; fallback?: ReactNode }) {
  const allowed = useSessionStore((state) => state.permissions.includes(permission));
  return allowed ? <>{children}</> : <>{fallback}</>;
}

export function PermissionNotice({ permission, children }: { permission: string; children: ReactNode }) {
  return <PermissionGate permission={permission} fallback={<span className="permission-muted" title="You do not have permission for this action">{children}</span>}>{children}</PermissionGate>;
}
