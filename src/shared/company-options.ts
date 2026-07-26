import type { CompanyOptionDto } from "@/shared/types/api.types";

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
