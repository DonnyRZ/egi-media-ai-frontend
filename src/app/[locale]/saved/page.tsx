import { AppShell } from "@/shared/app-shell";
import { AuthGate } from "@/shared/auth-gate";
import { SavedIssues } from "@/shared/saved-issues";

export default function SavedPage() {
  return <AuthGate><AppShell><div className="issues-page"><div className="issues-heading"><div><div className="eyebrow">Personal workspace</div><h1>Saved Issues</h1><p>Your company-scoped issue bookmarks.</p></div></div><SavedIssues /></div></AppShell></AuthGate>;
}
