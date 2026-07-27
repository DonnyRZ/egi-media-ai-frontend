import type { CompanyOptionDto } from "@/shared/types/api.types";

const UNNAMED_COMPANY = "Unnamed company";

/** Merge company option lists, preferring entries that carry tenant_id / name. */
export function mergeCompanyOptions(...sources: Array<CompanyOptionDto[] | undefined | null>): CompanyOptionDto[] {
  const map = new Map<string, CompanyOptionDto>();
  for (const list of sources) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item?.company_id) continue;
      const prev = map.get(item.company_id);
      map.set(item.company_id, {
        company_id: item.company_id,
        name: item.name ?? prev?.name ?? null,
        ...(item.tenant_id || prev?.tenant_id ? { tenant_id: item.tenant_id || prev?.tenant_id } : {}),
      });
    }
  }
  return [...map.values()];
}

export function toCompanyOptionsFromLogin(
  items: Array<CompanyOptionDto & { tenant_id?: string; role?: string }> | undefined | null,
): CompanyOptionDto[] {
  if (!Array.isArray(items)) return [];
  return mergeCompanyOptions(
    items.map((item) => ({
      company_id: item.company_id,
      name: item.name ?? null,
      ...(item.tenant_id ? { tenant_id: item.tenant_id } : {}),
    })),
  );
}

/** Human-facing company label — never prefer raw UUIDs as the primary text. */
export function displayCompanyName(company?: Pick<CompanyOptionDto, "name" | "company_id"> | null): string {
  const name = company?.name?.trim();
  if (name) return name;
  return UNNAMED_COMPANY;
}

export function displayCompanyInitial(company?: Pick<CompanyOptionDto, "name" | "company_id"> | null): string {
  const label = displayCompanyName(company);
  return label.slice(0, 1).toUpperCase() || "—";
}

export function resolveActiveCompany(
  companies: CompanyOptionDto[] | undefined | null,
  activeCompanyId: string | null | undefined,
): CompanyOptionDto | null {
  if (!activeCompanyId) return null;
  return companies?.find((item) => item.company_id === activeCompanyId) ?? { company_id: activeCompanyId, name: null };
}

export function activeCompanyLabel(
  companies: CompanyOptionDto[] | undefined | null,
  activeCompanyId: string | null | undefined,
): string {
  return displayCompanyName(resolveActiveCompany(companies, activeCompanyId));
}
