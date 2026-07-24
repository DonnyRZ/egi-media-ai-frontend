import { AppShell } from "@/shared/app-shell";
import { AuthGate } from "@/shared/auth-gate";
import { IssuesList } from "@/shared/issues-list";

export default function IssuesPage() {
  return <AuthGate><AppShell><IssuesList /></AppShell></AuthGate>;
}
