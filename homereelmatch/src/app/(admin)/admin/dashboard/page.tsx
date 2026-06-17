import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VideoManagerClient } from "@/components/admin/VideoManagerClient";
import { HouseMakerManagerClient } from "@/components/admin/HouseMakerManagerClient";
import { VenueManagerClient } from "@/components/admin/VenueManagerClient";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [videoCount, salespersonCount, pendingInquiries, houseMakerCount, venueCount] =
    await Promise.all([
      prisma.video.count(),
      prisma.salesperson.count(),
      prisma.contactRequest.count({ where: { status: "PENDING" } }),
      prisma.houseMaker.count(),
      prisma.venue.count(),
    ]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">管理者ダッシュボード</h1>
          <span className="text-xs text-gray-400 bg-yellow-900/50 px-2 py-1 rounded">ADMIN</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* 統計サマリー */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "総動画数", value: videoCount, color: "text-blue-400" },
            { label: "営業マン数", value: salespersonCount, color: "text-green-400" },
            { label: "未対応問い合わせ", value: pendingInquiries, color: "text-red-400" },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-900 rounded-xl p-4">
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ハウスメーカー管理 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-300">ハウスメーカー管理</h2>
            <span className="text-xs text-gray-500">{houseMakerCount}件登録済み</span>
          </div>
          <div className="bg-gray-900 rounded-xl p-5">
            <HouseMakerManagerClient />
          </div>
        </section>

        {/* 会場名管理 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-300">会場名管理</h2>
            <span className="text-xs text-gray-500">{venueCount}件登録済み</span>
          </div>
          <div className="bg-gray-900 rounded-xl p-5">
            <VenueManagerClient />
          </div>
        </section>

        {/* 動画管理 */}
        <section>
          <h2 className="text-base font-semibold text-gray-300 mb-3">動画管理</h2>
          <div className="bg-gray-900 rounded-xl p-5">
            <VideoManagerClient />
          </div>
        </section>
      </main>
    </div>
  );
}
