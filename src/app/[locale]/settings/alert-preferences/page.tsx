import { AppShell } from "@/shared/app-shell";
import { AlertPreferences } from "@/shared/alert-preferences";
import { AuthGate } from "@/shared/auth-gate";

export default function AlertPreferencesPage() {
  return <AuthGate><AppShell><AlertPreferences /></AppShell></AuthGate>;
}
