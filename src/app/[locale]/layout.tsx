import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import { QueryProvider } from "@/shared/providers/QueryProvider";
import { routing } from "@/i18n/routing";

import "../globals.css";

export const metadata: Metadata = { title: "EGI Media AI Dashboard", description: "AI-powered news insight dashboard" };

export function generateStaticParams() { return routing.locales.map((locale) => ({ locale })); }

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return null;
  setRequestLocale(locale);
  const messages = await getMessages();
  return <html lang={locale}><body><NextIntlClientProvider messages={messages}><QueryProvider>{children}</QueryProvider></NextIntlClientProvider></body></html>;
}
