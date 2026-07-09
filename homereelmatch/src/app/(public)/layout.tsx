import { PublicChrome } from "@/components/layout/PublicChrome";
import { getJourneyOverview } from "@/lib/journey";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { stages, progressFraction } = await getJourneyOverview();
  return (
    <PublicChrome stages={stages} progressFraction={progressFraction}>
      {children}
    </PublicChrome>
  );
}
