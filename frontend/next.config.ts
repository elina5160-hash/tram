import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  async redirects() {
    return [
      { source: "/", destination: "/home", permanent: false },
    ]
  },
  // Remove turbopack config if not using it explicitly or if it causes issues, 
  // but keeping it if it was there is fine. 
  // However, the previous config had `root: __dirname` which might be unnecessary or correct depending on setup.
  // I will keep it but clean up.
};

export default nextConfig;
