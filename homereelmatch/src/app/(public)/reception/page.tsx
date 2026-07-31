import { prisma } from "@/lib/prisma";
import { ReceptionCheckInClient } from "@/components/reception/ReceptionCheckInClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "受付 | HomeReelMatch",
  robots: { index: false, follow: false },
};

// 受付タブレット専用ページ。意図的に認証なし（受付カウンター内限定の運用で許容）。
export default async function ReceptionPage() {
  const [houseMakers, hashtags] = await Promise.all([
    prisma.houseMaker.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.hashtag.findMany({
      orderBy: { usageCount: "desc" },
      take: 20,
      select: { id: true, tagName: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-amber-50 text-stone-800">
      <ReceptionCheckInClient houseMakers={houseMakers} hashtags={hashtags} />
    </main>
  );
}
