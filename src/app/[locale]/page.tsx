import { AppShell } from "@/shared/app-shell";
import { AuthGate } from "@/shared/auth-gate";
import { ExecutiveSummary } from "@/shared/executive-summary";

export default function WorkspacePlaceholder() {
  return <AuthGate><AppShell><ExecutiveSummary /></AppShell></AuthGate>;
}
