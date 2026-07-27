"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { JourneyStageItem } from "@/lib/journey";

const STAGE_ICONS: Record<string, string> = {
  video: "🎥",
  contact: "💬",
};

// どのステーションを「今見ている」として強調するかをパスから判定する。
// 進捗ステータス(done/current/upcoming)とは独立した「現在地」の概念。
function deriveActiveKey(pathname: string): string | null {
  if (pathname === "/") return "video";
  if (pathname.startsWith("/consult")) return "contact";
  const match = pathname.match(/^\/journey\/([^/]+)/);
  return match ? match[1] : null;
}

function StationIcon({ stage, isActive }: { stage: JourneyStageItem; isActive: boolean }) {
  const icon = STAGE_ICONS[stage.key] ?? "📖";
  const base = "flex items-center justify-center w-11 h-11 rounded-full text-lg shrink-0 border-2";
  const activeRing = isActive ? "ring-2 ring-offset-2 ring-amber-500" : "";

  if (stage.status === "done") {
    return <div className={`${base} ${activeRing} bg-amber-600 border-amber-600 text-white`}>{icon}</div>;
  }
  if (stage.status === "current") {
    return <div className={`${base} ${activeRing} bg-amber-50 border-amber-500 text-amber-700 animate-pulse`}>{icon}</div>;
  }
  return <div className={`${base} ${activeRing} bg-stone-50 border-stone-200 text-stone-300`}>{icon}</div>;
}

export function JourneyPathMap({ stages }: { stages: JourneyStageItem[] }) {
  const pathname = usePathname();
  const activeKey = deriveActiveKey(pathname);

  if (stages.length === 0) {
    return <p className="text-sm text-stone-500 text-center py-12">学習コンテンツは準備中です</p>;
  }

  const currentIndex = stages.findIndex((s) => s.status === "current");

  return (
    <div>
      <div className="flex items-start">
        {stages.map((stage, index) => {
          const leftPassed = index > 0 && stages[index - 1].status === "done";
          const rightPassed = stage.status === "done";
          const isActive = stage.key === activeKey;
          return (
            <div key={stage.key} className="flex-1 flex flex-col items-center min-w-0">
              <div className="flex items-center w-full">
                {index > 0 && (
                  <div
                    className={`flex-1 h-0 border-t-4 border-dashed ${
                      leftPassed ? "border-amber-400" : "border-stone-200"
                    }`}
                  />
                )}
                <Link href={stage.href}>
                  <StationIcon stage={stage} isActive={isActive} />
                </Link>
                {index < stages.length - 1 && (
                  <div
                    className={`flex-1 h-0 border-t-4 border-dashed ${
                      rightPassed ? "border-amber-400" : "border-stone-200"
                    }`}
                  />
                )}
              </div>
              <Link href={stage.href} className="mt-1.5 flex flex-col items-center">
                <span
                  className={`text-[11px] text-center leading-tight ${
                    isActive
                      ? "text-amber-700 font-bold"
                      : stage.status === "current"
                        ? "text-amber-700 font-semibold"
                        : stage.status === "done"
                          ? "text-stone-500"
                          : "text-stone-300"
                  }`}
                >
                  {stage.label}
                </span>
                {stage.progressLabel && <span className="text-[10px] text-stone-400">{stage.progressLabel}</span>}
                {isActive && <span className="text-[9px] text-amber-600 font-medium mt-0.5">● 今ここ</span>}
              </Link>
            </div>
          );
        })}
      </div>

      {currentIndex !== -1 && (
        <p className="text-center text-xs text-stone-500 mt-4">
          ここまで来ました！ 次は
          <Link href={stages[currentIndex].href} className="text-amber-700 font-medium ml-1">
            {stages[currentIndex].label}へ
          </Link>
        </p>
      )}
    </div>
  );
}
