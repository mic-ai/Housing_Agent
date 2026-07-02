import { redirect } from "next/navigation";

interface ContactPageProps {
  params: Promise<{ salespersonId: string }>;
  searchParams: Promise<{ videoId?: string; method?: string }>;
}

// プロフィールとコンタクトフォームを /salesperson/[salespersonId] に統合したため、
// 旧URLへのリンク・ブックマークは統合後のページへリダイレクトする。
export default async function ContactPage({ params, searchParams }: ContactPageProps) {
  const { salespersonId } = await params;
  const sp2 = await searchParams;

  const query = new URLSearchParams();
  if (sp2.videoId) query.set("videoId", sp2.videoId);
  if (sp2.method) query.set("method", sp2.method);
  const qs = query.toString();

  redirect(`/salesperson/${salespersonId}${qs ? `?${qs}` : ""}#contact`);
}
