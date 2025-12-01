import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb", // Increase limit for file uploads
    },
  },
};

export default nextConfig;
