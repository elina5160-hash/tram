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
  async rewrites() {
    return [
      { source: "/Risling.png", destination: "/рислинг1.png" },
      { source: "/Rozling.png", destination: "/розлинг1.jpg" },
      { source: "/Xmel.png", destination: "/хмель1.png" },
      { source: "/Zakvaska.png", destination: "/1.png" },
      { source: "/night.png", destination: "/day.png" },
    ]
  },
  // Remove turbopack config if not using it explicitly or if it causes issues, 
  // but keeping it if it was there is fine. 
  // However, the previous config had `root: __dirname` which might be unnecessary or correct depending on setup.
  // I will keep it but clean up.
};

export default nextConfig;
