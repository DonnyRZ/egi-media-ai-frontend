import { Link } from "@/i18n/navigation";
import { AppShell } from "@/shared/app-shell";
import { AuthGate } from "@/shared/auth-gate";

export default function SettingsPage() {
  return <AuthGate><AppShell><div className="settings-hub"><div className="eyebrow">Workspace controls</div><h1>Settings</h1><p>Manage the company intelligence context and alert evaluation preferences.</p><div className="settings-hub-grid"><Link href="/settings/company-context"><strong>Company Context</strong><span>View the effective approved context.</span><em>Open →</em></Link><Link href="/settings/company-context/draft"><strong>Context draft flow</strong><span>Create, review, and approve a context draft.</span><em>Open →</em></Link><Link href="/settings/alert-preferences"><strong>Alert preferences</strong><span>Configure high alerts, digest, quiet hours, and timezone.</span><em>Open →</em></Link></div></div></AppShell></AuthGate>;
}
