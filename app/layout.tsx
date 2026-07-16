import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "GomMap",
  description: "좋아하는 장소를 검색하고 나만의 목록으로 보관하세요.",
  applicationName: "GomMap",
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    title: "GomMap",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: `${basePath}/gom.png`, type: "image/png" },
      { url: `${basePath}/favicon.svg`, type: "image/svg+xml" },
    ],
    shortcut: `${basePath}/gom.png`,
    apple: `${basePath}/gom.png`,
  },
};

export const viewport: Viewport = {
  themeColor: "#f46052",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
