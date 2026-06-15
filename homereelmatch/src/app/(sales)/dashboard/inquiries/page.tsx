import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { InquiriesClient } from "@/components/sales/InquiriesClient";

export default async function InquiriesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-white">←</Link>
          <h1 className="text-xl font-bold">問い合わせ管理</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-gray-900 rounded-xl p-5">
          <InquiriesClient salespersonId={session.user.id} />
        </div>
      </main>
    </div>
  );
}
