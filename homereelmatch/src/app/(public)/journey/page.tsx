import { getJourneyOverview } from "@/lib/journey";
import { JourneyPathMap } from "@/components/journey/JourneyPathMap";

export default async function JourneyPage() {
  const { stages } = await getJourneyOverview();

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 mb-1">マイ家づくり</h1>
      <p className="text-sm text-stone-500 mb-8">あなたのペースで、住宅づくりの基礎を学びましょう</p>
      <JourneyPathMap stages={stages} />
    </main>
  );
}
