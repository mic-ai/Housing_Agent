import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [videoCount, salespersonCount, pendingInquiries, houseMakerCount, venueCount, assignments, salespersons, activeVideos, houseMakers] =
    await Promise.all([
      prisma.video.count(),
      prisma.salesperson.count(),
      prisma.contactRequest.count({ where: { status: "PENDING" } }),
      prisma.houseMaker.count(),
      prisma.venue.count(),
      prisma.salespersonVideo.findMany({
        select: {
          id: true,
          preRollPublicUrl: true,
          postRollPublicUrl: true,
          salesperson: {
            select: {
              id: true,
              name: true,
              houseMaker: { select: { name: true } },
              faceVideos: {
                select: { id: true, rollType: true, publicUrl: true, durationSec: true },
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              },
            },
          },
          video: {
            select: {
              id: true,
              platform: true,
              url: true,
              title: true,
              thumbnailUrl: true,
              videoHashtags: { select: { hashtag: { select: { tagName: true } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.salesperson.findMany({
        select: { id: true, name: true, houseMaker: { select: { name: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.video.findMany({
        where: { isActive: true },
        select: { id: true, platform: true, url: true, title: true, thumbnailUrl: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.houseMaker.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">管理者ダッシュボード</h1>
          <span className="text-xs text-gray-400 bg-yellow-900/50 px-2 py-1 rounded">ADMIN</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "ハウスメーカー", value: houseMakerCount, color: "text-purple-400" },
            { label: "会場数", value: venueCount, color: "text-cyan-400" },
            { label: "接続設定数", value: assignments.length, color: "text-amber-400" },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-900 rounded-xl p-4">
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <AdminDashboardClient
          initialAssignments={assignments.map((a) => ({
            id: a.id,
            preRollPublicUrl: a.preRollPublicUrl,
            postRollPublicUrl: a.postRollPublicUrl,
            salesperson: {
              id: a.salesperson.id,
              name: a.salesperson.name,
              company: { name: a.salesperson.houseMaker?.name ?? "" },
              faceVideos: a.salesperson.faceVideos.map((fv) => ({
                id: fv.id,
                rollType: fv.rollType as "pre" | "post",
                publicUrl: fv.publicUrl,
                durationSec: fv.durationSec,
              })),
            },
            video: {
              id: a.video.id,
              platform: a.video.platform,
              url: a.video.url,
              title: a.video.title,
              thumbnailUrl: a.video.thumbnailUrl,
              hashtags: a.video.videoHashtags.map((vh) => vh.hashtag.tagName),
            },
          }))}
          salespersons={salespersons.map((sp) => ({
            id: sp.id,
            name: sp.name,
            company: { name: sp.houseMaker?.name ?? "" },
          }))}
          activeVideos={activeVideos.map((v) => ({ ...v, hashtags: [] }))}
          initialHouseMakers={houseMakers}
        />
      </main>
    </div>
  );
}
