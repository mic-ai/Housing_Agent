"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JourneyNudge } from "@/components/journey/JourneyNudge";
import type { JourneyStageItem } from "@/lib/journey";

const TABS = [
  {
    href: "/",
    label: "ホーム",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
  },
  {
    href: "/journey",
    label: "学習",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
  },
  {
    href: "/consult",
    label: "相談",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
];

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-amber-100 shadow-[0_-1px_4px_rgba(0,0,0,0.04)]">
      <div className="max-w-lg mx-auto flex items-stretch justify-around">
        {TABS.map((tab) => {
          const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs transition-colors ${
                isActive ? "text-amber-600 font-medium" : "text-stone-400 hover:text-stone-600"
              }`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PublicChrome({
  children,
  stages,
  progressFraction,
}: {
  children: React.ReactNode;
  stages: JourneyStageItem[];
  progressFraction: number;
}) {
  const pathname = usePathname();
  const showNav = !pathname.startsWith("/watch/");
  const showNudge = pathname === "/" || pathname.startsWith("/consult");

  return (
    <>
      {showNudge && <JourneyNudge stages={stages} progressFraction={progressFraction} />}
      <div className={showNav ? "pb-16" : ""}>{children}</div>
      {showNav && <BottomNav pathname={pathname} />}
    </>
  );
}
