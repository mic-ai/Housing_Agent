"use client";

import { useState } from "react";
import Link from "next/link";
import { JOURNEY_INTRO_DISMISSED_COOKIE, JOURNEY_INTRO_DISMISSED_MAX_AGE } from "@/lib/viewer-cookie";

export function FirstRunJourneyCard() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  function handleDismiss() {
    document.cookie = `${JOURNEY_INTRO_DISMISSED_COOKIE}=1; path=/; max-age=${JOURNEY_INTRO_DISMISSED_MAX_AGE}`;
    setDismissed(true);
  }

  return (
    <div className="relative bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="閉じる"
        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center text-stone-400 hover:text-stone-600 rounded-full"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <p className="text-sm font-bold text-stone-800 pr-6">📖 はじめての方へ</p>
      <p className="text-xs text-stone-600 mt-1">3分で家づくりの基礎を知る</p>
      <Link
        href="/journey"
        className="inline-block mt-2 text-sm font-medium text-amber-700 hover:text-amber-800"
      >
        読んでみる →
      </Link>
    </div>
  );
}
