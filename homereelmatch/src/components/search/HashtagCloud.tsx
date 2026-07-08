import Link from "next/link";
import { prisma } from "@/lib/prisma";

interface HashtagCloudProps {
  activeTag?: string;
  houseMakerId?: string;
  venueId?: string;
  salespersonId?: string;
}

export async function HashtagCloud({ activeTag, houseMakerId, venueId, salespersonId }: HashtagCloudProps = {}) {
  const hashtags = await prisma.hashtag.findMany({
    orderBy: { usageCount: "desc" },
    take: 20,
  });

  if (hashtags.length === 0) return null;

  function buildHref(tagName: string | null) {
    const params = new URLSearchParams();
    if (houseMakerId) params.set("houseMakerId", houseMakerId);
    if (venueId) params.set("venueId", venueId);
    if (salespersonId) params.set("salespersonId", salespersonId);
    if (tagName) params.set("tag", tagName);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4">
      {activeTag && (
        <Link
          href={buildHref(null)}
          className="flex-shrink-0 px-3 py-1.5 bg-white hover:bg-amber-50 text-stone-500 text-xs rounded-full transition-colors border border-stone-200 flex items-center gap-1 shadow-sm"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          クリア
        </Link>
      )}
      {hashtags.map((tag) => {
        const isActive = activeTag === tag.tagName;
        return (
          <Link
            key={tag.id}
            href={isActive ? buildHref(null) : buildHref(tag.tagName)}
            className={[
              "flex-shrink-0 px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap shadow-sm",
              isActive
                ? "bg-amber-500 text-white font-medium border border-amber-400"
                : "bg-white hover:bg-amber-50 text-stone-600 border border-stone-200",
            ].join(" ")}
          >
            #{tag.tagName}
            <span className={["ml-1 text-xs", isActive ? "text-amber-100" : "text-stone-400"].join(" ")}>
              {tag.usageCount}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
