"use client";

import { useEffect } from "react";
import Link from "next/link";

interface CelebrationOverlayProps {
  title: string;
  subtitle?: string;
  primaryHref: string;
  primaryLabel?: string;
  onDismiss: () => void;
  variant?: "amber" | "emerald";
}

const CONFETTI = Array.from({ length: 12 }, (_, i) => i);

export function CelebrationOverlay({
  title,
  subtitle,
  primaryHref,
  primaryLabel = "続ける →",
  onDismiss,
  variant = "amber",
}: CelebrationOverlayProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  const badgeColor = variant === "emerald" ? "bg-emerald-500" : "bg-amber-600";
  const subtitleColor = variant === "emerald" ? "text-emerald-700" : "text-amber-700";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/60 backdrop-blur-[2px] px-6 [animation:celebrate-backdrop_0.2s_ease-out]"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl px-6 py-8 max-w-xs w-full text-center overflow-hidden [animation:celebrate-in_0.35s_cubic-bezier(0.34,1.56,0.64,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {CONFETTI.map((i) => (
          <span
            key={i}
            className="absolute w-1.5 h-1.5 rounded-sm"
            style={{
              left: `${8 + ((i * 37) % 84)}%`,
              top: "-8px",
              backgroundColor: i % 2 === 0 ? "#d97706" : "#78716c",
              animation: `confetti-fall 1.1s ease-in ${i * 0.05}s forwards`,
            }}
          />
        ))}

        <div className={`mx-auto w-16 h-16 rounded-full ${badgeColor} flex items-center justify-center mb-4`}>
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <p className="text-lg font-bold text-stone-900">{title}</p>
        {subtitle && <p className={`text-sm mt-1 ${subtitleColor}`}>{subtitle}</p>}

        <div className="flex items-center justify-center gap-3 mt-6">
          <button type="button" onClick={onDismiss} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700">
            あとで
          </button>
          <Link
            href={primaryHref}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-full transition-colors"
          >
            {primaryLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
