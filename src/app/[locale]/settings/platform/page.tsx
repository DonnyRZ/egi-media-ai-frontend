import { AuthGate } from "@/shared/auth-gate";
import { AppShell } from "@/shared/app-shell";
import { PlatformProvisioning } from "@/shared/platform-provisioning";

export default function PlatformSettingsPage() { return <AuthGate><AppShell><PlatformProvisioning /></AppShell></AuthGate>; }
