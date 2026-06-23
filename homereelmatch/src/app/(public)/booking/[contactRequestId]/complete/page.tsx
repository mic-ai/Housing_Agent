import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import type { Metadata } from "next";

interface CompletePageProps {
  params: Promise<{ contactRequestId: string }>;
}

export const metadata: Metadata = {
  title: "予約完了",
};

export default async function BookingCompletePage({ params }: CompletePageProps) {
  const { contactRequestId } = await params;

  const contactRequest = await prisma.contactRequest.findUnique({
    where: { id: contactRequestId },
    include: {
      salesperson: { include: { company: true } },
      appointment: true,
    },
  });

  if (!contactRequest || !contactRequest.appointment) notFound();

  const { salesperson, appointment } = contactRequest;

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* 完了アイコン */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-900/50 mb-4">
            <span className="text-4xl">&#10003;</span>
          </div>
          <h1 className="text-2xl font-bold">予約が確定しました</h1>
          <p className="text-gray-400 mt-2 text-sm">
            確認通知をお送りしました
          </p>
        </div>

        {/* 予約詳細 */}
        <div className="bg-gray-900 rounded-xl p-5 space-y-4 mb-8">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">日時</p>
            <p className="text-white font-semibold mt-1">
              {formatDateTime(appointment.scheduledAt.toISOString())}
            </p>
          </div>

          <div className="border-t border-white/10" />

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">担当</p>
            <p className="text-white font-semibold mt-1">{salesperson.name}</p>
            <p className="text-gray-400 text-sm">{salesperson.company?.name}</p>
          </div>

          {(salesperson.company?.modelHouseName || salesperson.company?.modelHouseAddress) && (
            <>
              <div className="border-t border-white/10" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">場所</p>
                {salesperson.company?.modelHouseName && (
                  <p className="text-white font-semibold mt-1">
                    {salesperson.company?.modelHouseName}
                  </p>
                )}
                {salesperson.company?.modelHouseAddress && (
                  <p className="text-gray-400 text-sm">
                    {salesperson.company?.modelHouseAddress}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* ナビゲーション */}
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full py-3 text-center bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            ホームへ戻る
          </Link>
          <Link
            href={`/booking/${contactRequestId}`}
            className="block w-full py-3 text-center border border-white/20 hover:border-white/40 text-gray-300 text-sm rounded-xl transition-colors"
          >
            予約内容を確認する
          </Link>
        </div>
      </div>
    </main>
  );
}
