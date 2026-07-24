const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:5003";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3001";

export const env = {
  apiUrl: apiUrl.replace(/\/$/, ""),
  siteUrl: siteUrl.replace(/\/$/, ""),
  defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE === "en"
    || process.env.NEXT_PUBLIC_DEFAULT_LOCALE === "uz"
    ? process.env.NEXT_PUBLIC_DEFAULT_LOCALE
    : "id",
} as const;
