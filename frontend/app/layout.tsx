import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SnowfallBackground } from "@/components/ui/snow-flakes";
import Garland from "@/components/ui/garland";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Etra Shop",
  description: "Магазин ферментированных продуктов",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FAFAFA",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Garland />
        {children}
        <div className="fixed inset-0 pointer-events-none z-50">
          <SnowfallBackground count={40} speed={0.6} minSize={2} maxSize={14} minOpacity={0.2} maxOpacity={0.9} color="#9dd4ff" zIndex={1} wind={true} />
        </div>
      </body>
    </html>
  );
}
