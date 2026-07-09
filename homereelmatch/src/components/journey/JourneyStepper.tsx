import Link from "next/link";
import type { JourneyStageItem, JourneyStageStatus } from "@/lib/journey";

function StepDot({ index, status }: { index: number; status: JourneyStageStatus }) {
  if (status === "done") {
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-600 text-white shrink-0">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === "current") {
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold ring-2 ring-amber-500 shrink-0">
        {index + 1}
      </span>
    );
  }
  return (
    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-stone-100 text-stone-400 text-[10px] font-medium shrink-0">
      {index + 1}
    </span>
  );
}

export function JourneyStepper({ stages }: { stages: JourneyStageItem[] }) {
  if (stages.length === 0) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-2 flex items-center gap-1 overflow-x-auto">
      {stages.map((stage, index) => (
        <div key={stage.key} className="flex items-center gap-1 shrink-0">
          {index > 0 && (
            <span
              className={`w-3 h-0.5 shrink-0 ${
                stages[index - 1].status === "upcoming" ? "bg-stone-200" : "bg-amber-300"
              }`}
            />
          )}
          <Link href={stage.href} className="flex items-center gap-1">
            <StepDot index={index} status={stage.status} />
            <span
              className={`text-[11px] whitespace-nowrap ${
                stage.status === "current" ? "text-amber-700 font-semibold" : "text-stone-400"
              }`}
            >
              {stage.label}
              {stage.progressLabel && <span className="ml-0.5 text-stone-400">({stage.progressLabel})</span>}
            </span>
          </Link>
        </div>
      ))}
    </div>
  );
}
