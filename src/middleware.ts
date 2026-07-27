import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";

import { routing } from "@/i18n/routing";

const handleI18n = createMiddleware(routing);

function publicOrigin(request: NextRequest): URL {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site && !/localhost|127\.0\.0\.1/i.test(site)) {
    const base = new URL(site);
    const url = request.nextUrl.clone();
    url.protocol = base.protocol;
    url.host = base.host;
    return url;
  }

  const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.host;
  const url = request.nextUrl.clone();
  url.protocol = `${proto}:`;
  url.host = host.split(",")[0].trim();
  return url;
}

export default function middleware(request: NextRequest) {
  const url = publicOrigin(request);
  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.replace(":", ""));
  headers.set("x-forwarded-port", url.protocol === "https:" ? "443" : "80");
  const adapted = new NextRequest(url, { headers, method: request.method });
  return handleI18n(adapted);
}

export const config = { matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"] };
