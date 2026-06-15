import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { VideoListClient } from "@/components/sales/VideoListClient";

export default async function VideosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const salespersonId = session.user.id;

  const salespersonVideos = await prisma.salespersonVideo.findMany({
    where: { salespersonId },
    include: {
      video: {
        include: { videoHashtags: { include: { hashtag: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const videos = salespersonVideos.map((sv) => ({
    id: sv.video.id,
    title: sv.video.title,
    platform: sv.video.platform,
    thumbnailUrl: sv.video.thumbnailUrl,
    viewCount: sv.video.viewCount,
    isActive: sv.video.isActive,
    hashtags: sv.video.videoHashtags.map((vh) => vh.hashtag),
    salespersonVideoCount: 1,
  }));

  // Also show all active videos not yet associated with this salesperson
  const associatedVideoIds = salespersonVideos.map((sv) => sv.videoId);
  const otherVideos = await prisma.video.findMany({
    where: {
      isActive: true,
      id: { notIn: associatedVideoIds },
    },
    include: { videoHashtags: { include: { hashtag: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const otherVideoItems = otherVideos.map((v) => ({
    id: v.id,
    title: v.title,
    platform: v.platform,
    thumbnailUrl: v.thumbnailUrl,
    viewCount: v.viewCount,
    isActive: v.isActive,
    hashtags: v.videoHashtags.map((vh) => vh.hashtag),
    salespersonVideoCount: 0,
  }));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-white">←</Link>
            <h1 className="text-xl font-bold">動画管理</h1>
          </div>
          <Link
            href="/dashboard/videos/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            動画を登録
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {videos.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-300 mb-3">設定済み動画</h2>
            <div className="bg-gray-900 rounded-xl overflow-hidden">
              <VideoListClient videos={videos} salespersonId={salespersonId} />
            </div>
          </section>
        )}

        {otherVideoItems.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-300 mb-3">未設定の動画（顔出しを追加できます）</h2>
            <div className="bg-gray-900 rounded-xl overflow-hidden">
              <VideoListClient videos={otherVideoItems} salespersonId={salespersonId} />
            </div>
          </section>
        )}

        {videos.length === 0 && otherVideoItems.length === 0 && (
          <p className="text-center text-gray-500 py-12">動画がまだ登録されていません</p>
        )}
      </main>
    </div>
  );
}
