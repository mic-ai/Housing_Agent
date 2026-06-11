import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HomeReelMatch | 住宅情報動画 × 営業マンマッチング",
    template: "%s | HomeReelMatch",
  },
  description: "縦型ショート動画で住宅情報を探して、担当営業マンとマッチング",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-gray-950 antialiased">{children}</body>
    </html>
  );
}
