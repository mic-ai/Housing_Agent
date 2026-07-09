"use client";

import { useState } from "react";
import Link from "next/link";
import { JourneyPathMap } from "./JourneyPathMap";
import { JourneyRingBadge } from "./JourneyRingBadge";
import type { JourneyStageItem } from "@/lib/journey";

export function JourneyNudge({
  stages,
  progressFraction,
}: {
  stages: JourneyStageItem[];
  progressFraction: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const current = stages.find((s) => s.status === "current");
  if (!current) return null;

  const isFinalStage = current.key === "contact";

  return (
    <div className="bg-white border-b border-amber-100">
      <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex items-center gap-2 min-w-0 flex-1 text-left"
        >
          <JourneyRingBadge fraction={progressFraction} />
          <span className="text-xs text-stone-600 truncate">
            <span className="font-semibold text-amber-700">{current.label}</span>
            {current.progressLabel && <span className="ml-1 text-stone-400">({current.progressLabel})</span>}
          </span>
          <svg
            className={`w-3.5 h-3.5 text-stone-400 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {!isFinalStage && (
          <Link href={current.href} className="text-xs text-amber-600 font-medium hover:text-amber-700 shrink-0">
            次へ →
          </Link>
        )}
      </div>
      {expanded && (
        <div className="max-w-2xl mx-auto px-4 pb-4">
          <JourneyPathMap stages={stages} />
        </div>
      )}
    </div>
  );
}
