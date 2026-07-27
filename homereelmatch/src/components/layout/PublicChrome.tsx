"use client";

import { usePathname } from "next/navigation";
import { JourneyNudge } from "@/components/journey/JourneyNudge";
import type { JourneyStageItem } from "@/lib/journey";

export function PublicChrome({
  children,
  stages,
}: {
  children: React.ReactNode;
  stages: JourneyStageItem[];
}) {
  const pathname = usePathname();
  const showChrome = !pathname.startsWith("/watch/");

  return (
    <>
      {showChrome && <JourneyNudge stages={stages} />}
      {children}
    </>
  );
}
