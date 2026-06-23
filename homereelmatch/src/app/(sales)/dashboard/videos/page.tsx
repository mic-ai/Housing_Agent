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
    <div className="min-h-screen bg-stone-950 text-white">
      <header className="border-b border-stone-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors" aria-label="ダッシュボードへ戻る">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold tracking-tight">顔出し動画アップロード</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {salespersonVideos.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <p className="text-stone-400 text-sm">管理者が動画を割り当てると、ここに表示されます</p>
          </div>
        ) : (
          <div className="space-y-3">
            {salespersonVideos.map((sv) => (
              <div key={sv.id} className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center gap-4">
                {sv.video.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sv.video.thumbnailUrl}
                    alt={sv.video.title}
                    className="w-20 h-14 object-cover rounded-xl flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-14 bg-stone-800 border border-stone-700 rounded-xl flex items-center justify-center text-xs text-stone-500 flex-shrink-0">
                    {sv.video.platform}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{sv.video.title}</p>
                  <p className="text-xs text-stone-500 mt-1">
                    <span className={sv.preRollPublicUrl ? "text-green-400" : "text-stone-500"}>
                      {sv.preRollPublicUrl ? "● プリ設定済み" : "○ プリ未設定"}
                    </span>
                    <span className="mx-2 text-stone-700">／</span>
                    <span className={sv.postRollPublicUrl ? "text-green-400" : "text-stone-500"}>
                      {sv.postRollPublicUrl ? "● ポスト設定済み" : "○ ポスト未設定"}
                    </span>
                  </p>
                </div>

                <Link
                  href={`/dashboard/videos/${sv.video.id}/edit?salespersonId=${salespersonId}`}
                  className="flex-shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  設定
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
