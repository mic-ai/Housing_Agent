import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role === "ADMIN") redirect("/admin/dashboard");

  const salespersonId = session.user.id;

  const [inquiryCount, upcomingAppointments] = await Promise.all([
    prisma.contactRequest.count({
      where: { salespersonId, status: "PENDING" },
    }),
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
    <div className="min-h-screen bg-stone-950 text-white">
      <header className="border-b border-stone-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold tracking-tight">ダッシュボード</h1>
          </div>
          <Link href="/" className="text-stone-400 text-sm hover:text-amber-400 transition-colors">
            ポータルへ →
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* KPI card */}
        <Link
          href="/dashboard/inquiries"
          className="block p-5 bg-stone-900 border border-stone-800 rounded-2xl hover:border-amber-600/50 hover:bg-stone-800/60 transition-all group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-stone-400 text-xs font-medium uppercase tracking-wider mb-1">未対応の問い合わせ</p>
              <p className="text-4xl font-bold text-amber-400 tabular-nums">{inquiryCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 flex items-center justify-center group-hover:bg-amber-600/30 transition-colors">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          </div>
          <p className="text-stone-500 text-xs mt-2">タップして確認する →</p>
        </Link>

        {/* Upcoming appointments */}
        <div>
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-3">直近の面談予約</h2>
          {upcomingAppointments.length === 0 ? (
            <div className="p-4 bg-stone-900 border border-stone-800 rounded-xl text-center">
              <p className="text-stone-500 text-sm">予定なし</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center gap-3 p-3.5 bg-stone-900 border border-stone-800 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
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

        {/* Quick nav */}
        <div>
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-3">メニュー</h2>
          <nav className="grid grid-cols-2 gap-3">
            {[
              {
                href: "/dashboard/profile",
                label: "プロフィール・顔出し動画",
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                ),
              },
              {
                href: "/dashboard/inquiries",
                label: "問い合わせ管理",
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                ),
              },
              {
                href: "/dashboard/schedule",
                label: "スケジュール管理",
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                ),
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col gap-3 p-4 bg-stone-900 border border-stone-800 hover:border-stone-700 hover:bg-stone-800/60 rounded-xl text-sm font-medium text-white transition-all"
              >
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  {item.icon}
                </svg>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </main>
    </div>
  );
}
