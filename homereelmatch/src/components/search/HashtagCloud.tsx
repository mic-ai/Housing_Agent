import Link from "next/link";
import { prisma } from "@/lib/prisma";

export async function HashtagCloud() {
  const hashtags = await prisma.hashtag.findMany({
    orderBy: { usageCount: "desc" },
    take: 20,
  });

  if (hashtags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {hashtags.map((tag) => (
        <Link
          key={tag.id}
          href={`/tag/${encodeURIComponent(tag.tagName)}`}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm rounded-full transition-colors"
        >
          #{tag.tagName}
          <span className="ml-1 text-gray-400 text-xs">{tag.usageCount}</span>
        </Link>
      ))}
    </div>
  );
}
