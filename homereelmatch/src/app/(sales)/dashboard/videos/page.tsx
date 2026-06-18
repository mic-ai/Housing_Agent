import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-white">←</Link>
          <h1 className="text-xl font-bold">顔出し動画アップロード</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {salespersonVideos.length === 0 ? (
          <div className="text-center py-16 text-stone-500">
            <p className="text-4xl mb-3">🎬</p>
            <p className="text-sm">管理者が動画を割り当てると、ここに表示されます</p>
          </div>
        ) : (
          <div className="space-y-3">
            {salespersonVideos.map((sv) => (
              <div key={sv.id} className="bg-gray-900 rounded-xl p-4 flex items-center gap-4">
                {sv.video.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sv.video.thumbnailUrl}
                    alt={sv.video.title}
                    className="w-20 h-14 object-cover rounded"
                  />
                ) : (
                  <div className="w-20 h-14 bg-gray-800 rounded flex items-center justify-center text-xs text-gray-500">
                    {sv.video.platform}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{sv.video.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {sv.preRollPublicUrl ? "プリロール設定済み" : "プリロール未設定"}
                    {" ／ "}
                    {sv.postRollPublicUrl ? "ポストロール設定済み" : "ポストロール未設定"}
                  </p>
                </div>

                <Link
                  href={`/dashboard/videos/${sv.video.id}/edit?salespersonId=${salespersonId}`}
                  className="flex-shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  アップロード
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
