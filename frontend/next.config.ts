import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

if (isProduction) {
  const isLocalhost =
    !siteUrl ||
    siteUrl.includes("localhost") ||
    siteUrl.includes("127.0.0.1");

  if (isLocalhost) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be set to the production domain (e.g. https://www.status-timer.com) when NODE_ENV=production.",
    );
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/telemetry",
        destination: "/games",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
