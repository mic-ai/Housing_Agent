"use client";

import Link from "next/link";
import Image from "next/image";
import type { SalespersonVideoDTO, HashtagDTO } from "@/types";

interface VideoFooterProps {
  videoId: string;
  title: string;
  hashtags: HashtagDTO[];
  salespersonVideo: SalespersonVideoDTO | null;
  showContact?: boolean;
}

function LineIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg className="w-10 h-10 text-stone-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

export function VideoFooter({
  videoId,
  title,
  hashtags,
  salespersonVideo,
  showContact = false,
}: VideoFooterProps) {
  const sp = salespersonVideo?.salesperson;

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
        <div
          className={`transition-all duration-500 ease-out ${
            showContact
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-stone-700 flex-shrink-0 flex items-center justify-center ring-2 ring-amber-400/50">
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
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{sp.name}</p>
              <p className="text-stone-300 text-xs truncate">{sp.company?.name}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/contact/${sp.id}?videoId=${videoId}&method=LINE`}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-700 hover:bg-green-600 text-white text-sm font-medium py-3 px-3 rounded-lg transition-colors min-h-[44px]"
            >
              <LineIcon />
              LINEで連絡
            </Link>
            <Link
              href={`/contact/${sp.id}?videoId=${videoId}&method=EMAIL`}
              className="flex-1 flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium py-3 px-3 rounded-lg transition-colors min-h-[44px]"
            >
              <MailIcon />
              メールで連絡
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
