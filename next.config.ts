import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Playwright and some local clients hit 127.0.0.1 while `next dev` binds as localhost.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
  // Keep soft-nav RSC payloads warm so sidebar clicks reuse the last visit.
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default withNextIntl(nextConfig);
