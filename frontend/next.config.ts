import type { NextConfig } from "next";

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
