import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'meibdfguaaqcprvyfrpr.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  turbopack: {
    root: __dirname,
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
      { source: "/pay/success", destination: "/pay/confirm?status=success" },
      { source: "/pay/fail", destination: "/pay/confirm?status=fail" },
    ]
  },
  outputFileTracingExcludes: {
    '**/*': ['public/**']
  },
};

export default nextConfig;
