import Link from "next/link";
import { prisma } from "@/lib/prisma";

interface HashtagCloudProps {
  activeTag?: string;
}

export async function HashtagCloud({ activeTag }: HashtagCloudProps = {}) {
  const hashtags = await prisma.hashtag.findMany({
    orderBy: { usageCount: "desc" },
    take: 20,
  });

  if (hashtags.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4">
      {activeTag && (
        <Link
          href="/"
          className="flex-shrink-0 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-gray-300 text-xs rounded-full transition-colors border border-white/10 flex items-center gap-1"
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
            href={isActive ? "/" : `/?tag=${encodeURIComponent(tag.tagName)}`}
            className={[
              "flex-shrink-0 px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap",
              isActive
                ? "bg-amber-500 text-white font-medium border border-amber-400"
                : "bg-white/10 hover:bg-white/20 text-white border border-white/10",
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
