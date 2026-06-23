import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { ScheduleClient } from "@/components/sales/ScheduleClient";

export default async function SchedulePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      <header className="border-b border-stone-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors" aria-label="ダッシュボードへ戻る">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold tracking-tight">スケジュール管理</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
          <ScheduleClient salespersonId={session.user.id} />
        </div>
      </main>
    </div>
  );
}
