"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface WatchOverlayProps {
  videoId: string;
  videoTitle: string;
  videoUrl: string;
}

export function WatchOverlay({ videoId, videoTitle, videoUrl }: WatchOverlayProps) {
  const [copied, setCopied] = useState(false);

  // Increment view count once per mount (fire-and-forget)
  useEffect(() => {
    fetch(`/api/videos/${videoId}/view`, { method: "POST" }).catch(() => {});
  }, [videoId]);

  const handleShare = useCallback(async () => {
    const shareData = { title: videoTitle, url: videoUrl };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or unsupported — fall through to clipboard
      }
    }
    // Fallback: copy URL
    try {
      await navigator.clipboard.writeText(videoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available — silently ignore
    }
  }, [videoTitle, videoUrl]);

  return (
    <>
      {/* Back button — top-left */}
      <div className="absolute top-4 left-4 z-40">
        <Link
          href="/"
          aria-label="ホームへ戻る"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-stone-950/70 backdrop-blur-sm border border-white/10 text-white hover:bg-stone-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      </div>

      {/* Share button — top-right */}
      <div className="absolute top-4 right-4 z-40">
        <button
          type="button"
          onClick={handleShare}
          aria-label="この動画をシェア"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-stone-950/70 backdrop-blur-sm border border-white/10 text-white hover:bg-stone-800 transition-colors"
        >
          {copied ? (
            <svg className="w-4.5 h-4.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          )}
        </button>
      </div>

      {/* Copied toast */}
      {copied && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-14 right-4 z-40 bg-stone-800/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full border border-white/10"
        >
          URLをコピーしました
        </div>
      )}
    </>
  );
}
