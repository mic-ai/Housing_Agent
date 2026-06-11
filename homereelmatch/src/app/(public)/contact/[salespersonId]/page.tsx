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
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href={sp2.videoId ? `/watch/${sp2.videoId}` : "/"} className="text-gray-400 hover:text-white">
            &#8592;
          </Link>
          <h1 className="text-lg font-bold">連絡申請</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6 p-4 bg-gray-900 rounded-xl">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
            {salesperson.profileImage ? (
              <Image
                src={salesperson.profileImage}
                alt={salesperson.name}
                width={56}
                height={56}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 text-2xl">
                &#128100;
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-white">{salesperson.name}</p>
            <p className="text-gray-400 text-sm">{salesperson.company.name}</p>
            {salesperson.bio && (
              <p className="text-gray-500 text-xs mt-1 line-clamp-2">{salesperson.bio}</p>
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
