import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ProfileClient from "@/components/sales/ProfileClient";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [salesperson, houseMakers, profileVideos] = await Promise.all([
    prisma.salesperson.findUnique({
      where: { id: session.user.id },
      select: { name: true, bio: true, profileImage: true, houseMakerId: true },
    }),
    prisma.houseMaker.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.salespersonProfileVideo.findMany({
      where: { salespersonId: session.user.id },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  if (!salesperson) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-white">←</Link>
          <h1 className="text-xl font-bold">プロフィール編集</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <ProfileClient
          initialName={salesperson.name}
          initialBio={salesperson.bio}
          initialHouseMakerId={salesperson.houseMakerId}
          houseMakers={houseMakers}
          profileVideos={profileVideos}
        />
      </main>
    </div>
  );
}
