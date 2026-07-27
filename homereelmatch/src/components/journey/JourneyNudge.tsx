import { JourneyPathMap } from "./JourneyPathMap";
import type { JourneyStageItem } from "@/lib/journey";

export function JourneyNudge({ stages }: { stages: JourneyStageItem[] }) {
  return (
    <div className="bg-white border-b border-amber-100">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <JourneyPathMap stages={stages} />
      </div>
    </div>
  );
}
