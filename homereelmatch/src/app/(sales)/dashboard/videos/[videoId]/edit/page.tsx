import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { VideoEditClient } from "@/components/sales/VideoEditClient";

interface Props {
  params: Promise<{ videoId: string }>;
}

export default async function VideoEditPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { videoId } = await params;
  const salespersonId = session.user.id;

  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) notFound();

  const salespersonVideo = await prisma.salespersonVideo.findUnique({
    where: { videoId_salespersonId: { videoId, salespersonId } },
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/dashboard/videos" className="text-gray-400 hover:text-white">←</Link>
          <div>
            <h1 className="text-xl font-bold">顔出し動画設定</h1>
            <p className="text-gray-400 text-sm">{video.title}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <VideoEditClient
          video={{
            id: video.id,
            title: video.title,
            platform: video.platform,
            url: video.url,
            thumbnailUrl: video.thumbnailUrl,
          }}
          salespersonId={salespersonId}
          initialSalespersonVideo={salespersonVideo
            ? {
                id: salespersonVideo.id,
                preRollPublicUrl: salespersonVideo.preRollPublicUrl,
                preRollDurationSec: salespersonVideo.preRollDurationSec,
                postRollPublicUrl: salespersonVideo.postRollPublicUrl,
                postRollDurationSec: salespersonVideo.postRollDurationSec,
                isPrimary: salespersonVideo.isPrimary,
              }
            : null}
        />
      </main>
    </div>
  );
}
