import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // Allow uploaded images served from the .NET backend
      {
        protocol: "http",
        hostname: "localhost",
        port: "5010",
      },
    ],
  },
};

export default nextConfig;
