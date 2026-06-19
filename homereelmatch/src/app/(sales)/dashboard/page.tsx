import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role === "ADMIN") redirect("/admin/dashboard");

  const salespersonId = session.user.id;

  const [inquiryCount, videoCount, upcomingAppointments] = await Promise.all([
    prisma.contactRequest.count({
      where: { salespersonId, status: "PENDING" },
    }),
    prisma.salespersonVideo.count({ where: { salespersonId } }),
    prisma.appointment.findMany({
      where: {
        salespersonId,
        status: "CONFIRMED",
        scheduledAt: { gte: new Date() },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">ダッシュボード</h1>
          <Link href="/" className="text-gray-400 text-sm hover:text-white">
            ポータルへ
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/dashboard/inquiries"
            className="p-4 bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors"
          >
            <p className="text-3xl font-bold text-blue-400">{inquiryCount}</p>
            <p className="text-gray-400 text-sm mt-1">未対応の問い合わせ</p>
          </Link>
          <Link
            href="/dashboard/videos"
            className="p-4 bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors"
          >
            <p className="text-3xl font-bold text-green-400">{videoCount}</p>
            <p className="text-gray-400 text-sm mt-1">登録動画数</p>
          </Link>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-3">直近の面談予約</h2>
          {upcomingAppointments.length === 0 ? (
            <p className="text-gray-500 text-sm">予定なし</p>
          ) : (
            <div className="space-y-2">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="p-3 bg-gray-900 rounded-lg">
                  <p className="text-white text-sm">
                    {new Date(apt.scheduledAt).toLocaleString("ja-JP", {
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <nav className="grid grid-cols-2 gap-3">
          {[
            { href: "/dashboard/profile", label: "プロフィール編集" },
            { href: "/dashboard/inquiries", label: "問い合わせ管理" },
            { href: "/dashboard/videos", label: "顔出し動画" },
            { href: "/dashboard/schedule", label: "スケジュール管理" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="p-4 bg-gray-900 hover:bg-gray-800 rounded-xl text-center text-sm font-medium text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
