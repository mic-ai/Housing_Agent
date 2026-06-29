"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { extractYouTubeId, getYouTubeThumbnail } from "@/lib/utils";
import type { VideoDTO } from "@/types";

interface VideoCardProps {
  video: VideoDTO;
  priority?: boolean;
}

function ThumbnailPlaceholder({ video }: { video: VideoDTO }) {
  const label = video.houseMaker?.name ?? video.title;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900 gap-2">
      <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
        <span className="text-white text-2xl font-bold tracking-tight">{label.slice(0, 2)}</span>
      </div>
      <svg className="w-7 h-7 text-white/30 mt-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5v14l11-7z" />
      </svg>
    </div>
  );
}

function SalespersonAvatar({ sp }: { sp: { name: string; profileImage: string | null } }) {
  return (
    <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-700 flex-shrink-0 ring-2 ring-amber-400/40">
      {sp.profileImage ? (
        <Image src={sp.profileImage} alt={sp.name} width={40} height={40} className="object-cover w-full h-full" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-amber-900/60 text-amber-200 text-sm font-bold">
          {sp.name.slice(0, 1)}
        </div>
      )}
    </div>
  );
}

function CtaButtons({ salespersonId, videoId }: { salespersonId: string; videoId: string }) {
  return (
    <div className="flex gap-1.5">
      <Link
        href={`/contact/${salespersonId}?videoId=${videoId}&method=LINE`}
        className="flex-1 flex items-center justify-center gap-1 bg-green-700 hover:bg-green-600 active:bg-green-800 text-white text-xs font-medium py-2.5 rounded-lg transition-colors"
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.630 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
        </svg>
        LINE
      </Link>
      <Link
        href={`/contact/${salespersonId}?videoId=${videoId}&method=EMAIL`}
        className="flex-1 flex items-center justify-center gap-1 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-xs font-medium py-2.5 rounded-lg transition-colors"
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        メール
      </Link>
    </div>
  );
}

export function VideoCard({ video, priority = false }: VideoCardProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [thumbErrored, setThumbErrored] = useState(false);
  const salesperson = video.salespersonVideos[0]?.salesperson;

  const ytId = video.platform === "YOUTUBE" ? extractYouTubeId(video.url) : null;
  const ytThumb = ytId ? getYouTubeThumbnail(ytId) : null;
  const thumbnailSrc = thumbErrored ? ytThumb : (video.thumbnailUrl ?? ytThumb);

  const toggleMobile = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMobileOpen((v) => !v);
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="group">
      <div className="relative aspect-[9/16] bg-stone-900 rounded-xl overflow-hidden">
        {/* Thumbnail */}
        {thumbnailSrc ? (
          <Image
            src={thumbnailSrc}
            alt={video.title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            onError={() => setThumbErrored(true)}
          />
        ) : (
          <ThumbnailPlaceholder video={video} />
        )}

        {/* Main watch link — covers the card; hover play button lives inside */}
        <Link
          href={`/watch/${video.id}`}
          className="absolute inset-0 z-10"
          aria-label={`${video.title}を視聴`}
        >
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/20 backdrop-blur-sm rounded-full p-3 border border-white/30">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </Link>

        {/* HouseMaker badge */}
        {video.houseMaker && (
          <div className="absolute top-2 left-2 z-20 pointer-events-none">
            <span className="bg-stone-950/70 backdrop-blur-sm text-amber-100 text-xs px-2 py-0.5 rounded-full border border-amber-400/20">
              {video.houseMaker.name}
            </span>
          </div>
        )}

        {/* Bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-transparent to-transparent z-20 pointer-events-none" />

        {/* Static info: title + hashtags */}
        <div
          className={[
            "absolute left-0 right-0 z-30 p-3 pointer-events-none transition-all duration-200",
            // Desktop: fade out on hover when salesperson is present
            salesperson ? "md:group-hover:opacity-0 md:group-hover:translate-y-1" : "",
            // Mobile: shift up to sit above the mini-bar
            salesperson ? "bottom-12 md:bottom-0" : "bottom-0",
          ].join(" ")}
        >
          <p className="text-white text-sm font-medium line-clamp-2">{video.title}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {video.hashtags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="text-xs text-amber-300">
                #{tag.tagName}
              </span>
            ))}
          </div>
        </div>

        {/* ── Desktop: hover overlay (md+) ── */}
        {salesperson && (
          <div className="hidden md:block absolute bottom-0 left-0 right-0 z-30 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
            <div className="bg-gradient-to-t from-stone-950 via-stone-950/95 to-transparent pt-10 pb-3 px-3">
              <div className="flex items-center gap-2.5 mb-2">
                <SalespersonAvatar sp={salesperson} />
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{salesperson.name}</p>
                  <p className="text-stone-400 text-xs truncate">{salesperson.company?.name}</p>
                </div>
              </div>
              {salesperson.bio && (
                <p className="text-stone-300 text-xs line-clamp-2 mb-2.5 leading-relaxed">
                  {salesperson.bio}
                </p>
              )}
              <CtaButtons salespersonId={salesperson.id} videoId={video.id} />
            </div>
          </div>
        )}

        {/* ── Mobile: tap-to-expand panel (below md) ── */}
        {salesperson && (
          <>
            {/* Backdrop: closes panel when tapping above it */}
            {mobileOpen && (
              <div
                className="md:hidden absolute inset-0 z-[25]"
                onClick={closeMobile}
                aria-hidden="true"
              />
            )}

            <div className="md:hidden absolute bottom-0 left-0 right-0 z-30">
              {/* Mini-bar — always visible on mobile */}
              <button
                type="button"
                onClick={toggleMobile}
                aria-expanded={mobileOpen}
                aria-label="担当営業マンの情報を表示"
                className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-t from-stone-950 via-stone-950/80 to-transparent"
              >
                <SalespersonAvatar sp={salesperson} />
                <div className="min-w-0 text-left flex-1">
                  <p className="text-white text-xs font-semibold truncate">{salesperson.name}</p>
                  <p className="text-stone-400 text-xs truncate">{salesperson.company?.name}</p>
                </div>
                <svg
                  className={`w-4 h-4 text-stone-400 flex-shrink-0 transition-transform duration-200 ${mobileOpen ? "-rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded panel */}
              <div
                className={`bg-stone-950/95 px-3 overflow-hidden transition-all duration-200 ${
                  mobileOpen ? "max-h-40 pb-3 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                {salesperson.bio && (
                  <p className="text-stone-300 text-xs line-clamp-2 mb-2.5 pt-1 leading-relaxed">
                    {salesperson.bio}
                  </p>
                )}
                <CtaButtons salespersonId={salesperson.id} videoId={video.id} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
