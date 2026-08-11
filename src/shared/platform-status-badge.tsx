import { STATUS_META, type TenantStatus } from "@/shared/platform-tenant-shared";

export function StatusBadge({ status }: { status: TenantStatus }) {
  return (
    <span className={`platform-tenant-status is-${status}`}>
      <i aria-hidden="true" />
      {STATUS_META[status].label}
    </span>
  );
}
