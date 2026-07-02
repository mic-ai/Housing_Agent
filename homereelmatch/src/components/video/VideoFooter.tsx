"use client";

import Link from "next/link";
import Image from "next/image";
import type { SalespersonVideoDTO, HashtagDTO } from "@/types";

interface VideoFooterProps {
  videoId: string;
  title: string;
  hashtags: HashtagDTO[];
  salespersonVideo: SalespersonVideoDTO | null;
}

function PersonIcon() {
  return (
    <svg className="w-10 h-10 text-stone-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

export function VideoFooter({ videoId, title, hashtags, salespersonVideo }: VideoFooterProps) {
  const sp = salespersonVideo?.salesperson;
  const profileHref = sp ? `/salesperson/${sp.id}?videoId=${videoId}` : "";

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-stone-950/90 via-stone-900/50 to-transparent">
      <p className="text-white text-sm font-semibold line-clamp-2 mb-2">{title}</p>

      {hashtags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none mb-3 -mx-1 px-1">
          {hashtags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tag/${encodeURIComponent(tag.tagName)}`}
              className="flex-shrink-0 text-xs text-amber-300 hover:text-amber-200 whitespace-nowrap"
            >
              #{tag.tagName}
            </Link>
          ))}
        </div>
      )}

      {sp && (
        <div>
          <Link
            href={profileHref}
            className="flex items-center gap-3 mb-3"
            aria-label={`${sp.name}のプロフィールを見る`}
          >
            <span className="w-20 h-20 rounded-full overflow-hidden bg-stone-700 flex-shrink-0 flex items-center justify-center ring-2 ring-amber-400/50 hover:ring-amber-300 transition-all">
              {sp.profileImage ? (
                <Image
                  src={sp.profileImage}
                  alt={sp.name}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              ) : (
                <PersonIcon />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-white text-sm font-medium truncate">{sp.name}</span>
              <span className="block text-stone-300 text-xs truncate">{sp.company?.name}</span>
            </span>
          </Link>

          <Link
            href={profileHref}
            className="flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium py-3 px-3 rounded-lg transition-colors min-h-[44px]"
          >
            プロフィールを見て連絡する
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
