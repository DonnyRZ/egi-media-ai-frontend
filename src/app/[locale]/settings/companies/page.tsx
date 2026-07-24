import { AuthGate } from "@/shared/auth-gate";
import { AppShell } from "@/shared/app-shell";
import { TenantCompanyManagement } from "@/shared/tenant-company-management";

export default function CompaniesSettingsPage() { return <AuthGate><AppShell><TenantCompanyManagement /></AppShell></AuthGate>; }
