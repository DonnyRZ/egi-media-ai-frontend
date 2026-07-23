import { AppShell } from "@/shared/app-shell";
import { AuthGate } from "@/shared/auth-gate";
import { CompanyContextDraftFlow } from "@/shared/company-context-draft-flow";

export default function CompanyContextDraftPage() {
  return <AuthGate><AppShell><CompanyContextDraftFlow /></AppShell></AuthGate>;
}
