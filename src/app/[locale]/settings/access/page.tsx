import { AppShell } from "@/shared/app-shell";
import { AuthGate } from "@/shared/auth-gate";
import { AccessManagement } from "@/shared/access-management";

export default function AccessPage() { return <AuthGate><AppShell><AccessManagement /></AppShell></AuthGate>; }
