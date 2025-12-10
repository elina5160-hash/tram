import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/", destination: "/home", permanent: false },
    ]
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
