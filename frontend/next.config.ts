import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // Allow uploaded images served from the .NET backend (localhost + LAN)
      {
        protocol: "http",
        hostname: "localhost",
        port: "5010",
      },
      {
        protocol: "http",
        hostname: "192.168.1.17",
        port: "5010",
      },
    ],
  },
};

export default nextConfig;
