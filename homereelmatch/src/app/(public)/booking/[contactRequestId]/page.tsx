import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookingCalendar } from "@/components/contact/BookingCalendar";
import Link from "next/link";

interface BookingPageProps {
  params: Promise<{ contactRequestId: string }>;
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { contactRequestId } = await params;

  const contactRequest = await prisma.contactRequest.findUnique({
    where: { id: contactRequestId },
    include: {
      salesperson: { include: { company: true } },
    },
  });
  if (!contactRequest) notFound();

  const slots = await prisma.availableSlot.findMany({
    where: {
      salespersonId: contactRequest.salespersonId,
      isBooked: false,
      startAt: { gte: new Date() },
    },
    orderBy: { startAt: "asc" },
    take: 20,
  });

  const slotDTOs = slots.map((s) => ({
    id: s.id,
    salespersonId: s.salespersonId,
    startAt: s.startAt.toISOString(),
    endAt: s.endAt.toISOString(),
    isBooked: s.isBooked,
  }));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white">&#8592;</Link>
          <h1 className="text-lg font-bold">面談予約</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-6 p-4 bg-gray-900 rounded-xl">
          <p className="text-gray-400 text-sm">担当営業マン</p>
          <p className="font-semibold text-white mt-1">{contactRequest.salesperson.name}</p>
          <p className="text-gray-400 text-sm">{contactRequest.salesperson.company.name}</p>
          {contactRequest.salesperson.company.modelHouseAddress && (
            <p className="text-gray-500 text-xs mt-1">
              {contactRequest.salesperson.company.modelHouseName}
              <br />
              {contactRequest.salesperson.company.modelHouseAddress}
            </p>
          )}
        </div>

        <h2 className="text-base font-medium mb-3">ご希望の日時を選択</h2>
        <BookingCalendar contactRequestId={contactRequestId} slots={slotDTOs} />
      </main>
    </div>
  );
}
