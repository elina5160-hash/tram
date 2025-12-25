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
      {
        protocol: 'https',
        hostname: 't.me',
      },
      {
        protocol: 'https',
        hostname: 'cdn4.telesco.pe',
      },
      {
        protocol: 'https',
        hostname: 'telegram.org',
      },
      {
        protocol: 'https',
        hostname: '*.telegram.org',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.tinkoff.ru https://*.tcsbank.ru https://*.tbank.ru https://*.nspk.ru https://*.t-static.ru https://telegram.org https://app.grammy.dev; img-src 'self' data: https://*.tinkoff.ru https://*.tcsbank.ru https://*.tbank.ru https://*.nspk.ru https://*.t-static.ru https://meibdfguaaqcprvyfrpr.supabase.co https://t.me https://cdn4.telesco.pe https://telegram.org https://*.telegram.org; connect-src 'self' https://*.tinkoff.ru https://*.tcsbank.ru https://*.tbank.ru https://*.nspk.ru https://*.t-static.ru https://meibdfguaaqcprvyfrpr.supabase.co https://api.telegram.org https://script.google.com; style-src 'self' 'unsafe-inline' https://*.tinkoff.ru https://*.tcsbank.ru https://*.tbank.ru https://*.nspk.ru https://*.t-static.ru; frame-src 'self' https://*.tinkoff.ru https://*.tcsbank.ru https://*.tbank.ru"
          }
        ],
      },
    ]
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
  outputFileTracingExcludes: {
    '**/*': ['public/**']
  },
};

export default nextConfig;
