import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { VideoNewForm } from "@/components/sales/VideoNewForm";

export default async function VideoNewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [houseMakers, venues] = await Promise.all([
    prisma.houseMaker.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, logoUrl: true, isActive: true },
    }),
    prisma.venue.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true, isActive: true },
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/dashboard/videos" className="text-gray-400 hover:text-white">←</Link>
          <h1 className="text-xl font-bold">動画を登録</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <VideoNewForm houseMakers={houseMakers} venues={venues} />
      </main>
    </div>
  );
}
