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

export function VideoFooter({
  videoId,
  title,
  hashtags,
  salespersonVideo,
}: VideoFooterProps) {
  const sp = salespersonVideo?.salesperson;

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
      <p className="text-white text-sm font-semibold line-clamp-2 mb-2">{title}</p>

      <div className="flex flex-wrap gap-1 mb-3">
        {hashtags.map((tag) => (
          <Link
            key={tag.id}
            href={`/tag/${encodeURIComponent(tag.tagName)}`}
            className="text-xs text-blue-300 hover:text-blue-200"
          >
            #{tag.tagName}
          </Link>
        ))}
      </div>

      {sp && (
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
            {sp.profileImage ? (
              <Image
                src={sp.profileImage}
                alt={sp.name}
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
                &#128100;
              </div>
            )}
          </div>
          <div>
            <p className="text-white text-sm font-medium">{sp.name}</p>
            <p className="text-gray-300 text-xs">{sp.company.name}</p>
          </div>
        </div>
      )}

      {sp && (
        <div className="flex gap-2">
          <Link
            href={`/contact/${sp.id}?videoId=${videoId}&method=LINE`}
            className="flex-1 flex items-center justify-center gap-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
          >
            <span>&#128241;</span> LINEで連絡
          </Link>
          <Link
            href={`/contact/${sp.id}?videoId=${videoId}&method=EMAIL`}
            className="flex-1 flex items-center justify-center gap-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
          >
            <span>&#9993;</span> メールで連絡
          </Link>
        </div>
      )}
    </div>
  );
}
