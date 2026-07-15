import type { Metadata, Viewport } from "next";
import { safeJsonLd } from "@/lib/utils";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://homereelmatch.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "HomeReelMatch | 住宅情報動画 × 営業マンマッチング",
    template: "%s | HomeReelMatch",
  },
  description: "縦型ショート動画で住宅情報を探して、担当営業マンとマッチング。注文住宅・建売・ハウスメーカーの動画を見て、あなたに合った営業マンと出会えます。",
  keywords: ["住宅", "注文住宅", "ハウスメーカー", "新築", "営業マン", "マッチング", "動画", "モデルハウス"],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "HomeReelMatch",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    site: "@homereelmatch",
  },
  alternates: {
    canonical: APP_URL,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#030712",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "HomeReelMatch",
  url: APP_URL,
  description: "縦型ショート動画で住宅情報を探して、担当営業マンとマッチング",
  inLanguage: "ja",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${APP_URL}/?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="h-full">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLd) }}
        />
        {/* YouTube サムネイル・プレーヤーへの事前接続 */}
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://img.youtube.com" />
        {/* Supabase Storage（顔出し動画）への事前接続 */}
        <link rel="dns-prefetch" href="https://supabase.co" />
      </head>
      <body className="min-h-full bg-gray-950 antialiased">{children}</body>
    </html>
  );
}
