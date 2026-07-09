import { PublicChrome } from "@/components/layout/PublicChrome";
import { getJourneyOverview } from "@/lib/journey";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { stages } = await getJourneyOverview();
  return <PublicChrome stages={stages}>{children}</PublicChrome>;
}
