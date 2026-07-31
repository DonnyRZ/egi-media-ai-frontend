import type { CompanyContextDto, IssueCardDto, IssueListDto } from "@/shared/types/api.types";

export interface IssueViewModel {
  id: string;
  title: string;
  oneLiner: string | null;
  status: IssueCardDto["status"];
  priority: IssueCardDto["priority"];
  firstSeenAt: string;
  lastDevelopedAt: string | null;
  version: number;
}

export function mapIssueCard(dto: IssueCardDto): IssueViewModel {
  return {
    id: dto.issue_id,
    title: dto.title,
    oneLiner: dto.one_liner,
    status: dto.status,
    priority: dto.priority,
    firstSeenAt: dto.first_seen_at,
    lastDevelopedAt: dto.last_developed_at,
    version: dto.version,
  };
}

export function mapIssueList(dto: IssueListDto) {
  return { items: dto.items.map(mapIssueCard), pagination: dto.meta };
}

export function mapCompanyContext(dto: CompanyContextDto) {
  return {
    id: dto.context_id,
    companyId: dto.company_id,
    version: dto.version,
    status: dto.status,
    source: dto.source,
    draftId: dto.draft_id,
    fields: dto.fields,
    fieldSources: dto.field_sources ?? [],
    missingFields: dto.missing_fields ?? [],
    changeReason: dto.change_reason,
    updatedBy: dto.updated_by,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    managementIdentity: dto.management_identity
      ? {
          status: dto.management_identity.status,
          contextVersion: dto.management_identity.context_version,
          companyName: dto.management_identity.company_name,
          lensSummary: dto.management_identity.lens_summary,
          fingerprint: dto.management_identity.fingerprint,
          errorMessage: dto.management_identity.error_message,
          updatedAt: dto.management_identity.updated_at,
        }
      : null,
  };
}
