import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HomeReelMatch | 住宅情報動画 × 営業マンマッチング",
    template: "%s | HomeReelMatch",
  },
  description: "縦型ショート動画で住宅情報を探して、担当営業マンとマッチング",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#030712",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="h-full">
      <head>
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
