import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@habit-tracker/shared", "otter-ds"],
};

export default nextConfig;
