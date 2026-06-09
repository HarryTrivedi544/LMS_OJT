import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@lms/shared", "@lms/api-contracts"],
};

export default nextConfig;
