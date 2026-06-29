import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContactForm } from "@/components/contact/ContactForm";
import Image from "next/image";
import Link from "next/link";

interface ContactPageProps {
  params: Promise<{ salespersonId: string }>;
  searchParams: Promise<{ videoId?: string; method?: string }>;
}

export default async function ContactPage({ params, searchParams }: ContactPageProps) {
  const { salespersonId } = await params;
  const sp2 = await searchParams;

  const salesperson = await prisma.salesperson.findUnique({
    where: { id: salespersonId },
    include: { company: true },
  });
  if (!salesperson) notFound();

  const defaultMethod = sp2.method === "EMAIL" ? "EMAIL" : "LINE";

  return (
    <div className="min-h-screen bg-amber-50 text-stone-800">
      <header className="sticky top-0 z-10 bg-white border-b border-amber-100 shadow-sm px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link
            href={sp2.videoId ? `/watch/${sp2.videoId}` : "/"}
            className="w-11 h-11 flex items-center justify-center text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
            aria-label="戻る"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-stone-800">連絡申請</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6 p-4 bg-white rounded-xl shadow-sm border border-amber-100">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-amber-100 flex-shrink-0 ring-2 ring-amber-200">
            {salesperson.profileImage ? (
              <Image
                src={salesperson.profileImage}
                alt={salesperson.name}
                width={56}
                height={56}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-amber-400 text-2xl">
                &#128100;
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-stone-800">{salesperson.name}</p>
            <p className="text-stone-500 text-sm">{salesperson.company?.name}</p>
            {salesperson.bio && (
              <p className="text-stone-400 text-xs mt-1 line-clamp-2">{salesperson.bio}</p>
            )}
          </div>
        </div>

        <ContactForm
          salespersonId={salespersonId}
          videoId={sp2.videoId}
          defaultMethod={defaultMethod as "LINE" | "EMAIL"}
        />
      </main>
    </div>
  );
}
