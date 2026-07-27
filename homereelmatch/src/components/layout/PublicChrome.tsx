"use client";

import { usePathname } from "next/navigation";
import { JourneyNudge } from "@/components/journey/JourneyNudge";
import type { JourneyStageItem } from "@/lib/journey";

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
  const showChrome = !pathname.startsWith("/watch/");

  return (
    <>
      {showChrome && <JourneyNudge stages={stages} progressFraction={progressFraction} />}
      {children}
    </>
  );
}
