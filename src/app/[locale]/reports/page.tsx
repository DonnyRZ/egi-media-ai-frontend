import { AppShell } from "@/shared/app-shell";
import { AuthGate } from "@/shared/auth-gate";
import { ReportsWorkspace } from "@/shared/reports-workspace";

export default function ReportsPage() {
  return <AuthGate><AppShell><div className="issues-page"><div className="issues-heading"><div><div className="eyebrow">Executive reporting</div><h1>Reports</h1><p>Review validated report drafts before approval and sharing.</p></div></div><ReportsWorkspace /></div></AppShell></AuthGate>;
}
