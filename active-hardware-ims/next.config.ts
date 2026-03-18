import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
