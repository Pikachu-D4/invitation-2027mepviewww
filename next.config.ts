import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow remote images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
// Orchids restart: 1764091757591
