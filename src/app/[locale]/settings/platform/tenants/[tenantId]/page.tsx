import { PlatformWorkspaceDetail } from "@/shared/platform-workspace-detail";

export default async function PlatformWorkspaceDetailPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return <PlatformWorkspaceDetail tenantId={tenantId} />;
}
