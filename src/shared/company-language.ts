export type CompanyLanguage = "id" | "en";

export const DEFAULT_COMPANY_LANGUAGE: CompanyLanguage = "id";

export function resolveCompanyLanguage(value: unknown): CompanyLanguage {
  return value === "en" || value === "id" ? value : "id";
}
