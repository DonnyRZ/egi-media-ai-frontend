import { AppShell } from "@/shared/app-shell";
import { AuthGate } from "@/shared/auth-gate";
import { AlertsInbox } from "@/shared/alerts-inbox";

export default function AlertsPage() {
  return <AuthGate><AppShell><div className="issues-page"><div className="issues-heading"><div><div className="eyebrow">Delivery archive</div><h1>Alerts</h1><p>Validated alert delivery events for the active company.</p></div></div><AlertsInbox /></div></AppShell></AuthGate>;
}
