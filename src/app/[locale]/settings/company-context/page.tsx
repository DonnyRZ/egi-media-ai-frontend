import { AppShell } from "@/shared/app-shell";
import { AuthGate } from "@/shared/auth-gate";
import { CompanyContextRead } from "@/shared/company-context-read";

export default function CompanyContextPage() {
  return <AuthGate><AppShell><CompanyContextRead /></AppShell></AuthGate>;
}
