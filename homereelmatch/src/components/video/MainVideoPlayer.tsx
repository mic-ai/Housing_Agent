"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { extractYouTubeId } from "@/lib/utils";
import type { Platform } from "@/types";

declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars: Record<string, number | string>;
          events: {
            onStateChange?: (e: { data: number }) => void;
            onReady?: () => void;
          };
        }
      ) => {
        destroy: () => void;
        getCurrentTime: () => number;
        getDuration: () => number;
      };
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface MainVideoPlayerProps {
  platform: Platform;
  url: string;
  onEnded: () => void;
  onNearEnd?: () => void;
  autoPlay?: boolean;
}

export function MainVideoPlayer({
  platform,
  url,
  onEnded,
  onNearEnd,
  autoPlay = true,
}: MainVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{
    destroy: () => void;
    getCurrentTime: () => number;
    getDuration: () => number;
  } | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nearEndFiredRef = useRef(false);

  const initYouTube = useCallback(() => {
    const videoId = extractYouTubeId(url);
    if (!videoId || !containerRef.current) return;

    nearEndFiredRef.current = false;

    const el = document.createElement("div");
    containerRef.current.appendChild(el);

    playerRef.current = new window.YT.Player(el, {
      videoId,
      playerVars: {
        autoplay: autoPlay ? 1 : 0,
        controls: 1,
        playsinline: 1,
        rel: 0,
      },
      events: {
        onReady: () => {
          if (onNearEnd) {
            pollIntervalRef.current = setInterval(() => {
              if (nearEndFiredRef.current || !playerRef.current) return;
              const duration = playerRef.current.getDuration();
              const current = playerRef.current.getCurrentTime();
              if (duration > 0 && duration - current <= 20) {
                nearEndFiredRef.current = true;
                onNearEnd();
              }
            }, 1000);
          }
        },
        onStateChange: (e) => {
          if (e.data === window.YT.PlayerState.ENDED) onEnded();
        },
      },
    });
  }, [url, autoPlay, onEnded, onNearEnd]);

  useEffect(() => {
    if (platform !== "YOUTUBE") return;

    if (window.YT?.Player) {
      initYouTube();
    } else {
      window.onYouTubeIframeAPIReady = initYouTube;
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [platform, initYouTube]);

  if (platform === "INSTAGRAM") {
    return <InstagramEmbed url={url} onEnded={onEnded} onNearEnd={onNearEnd} />;
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full"
    />
  );
}

// Instagram embed: tries the oEmbed proxy first; falls back to an "open on Instagram" link.
// Instagram blocks cross-origin iframes, so we never use a direct iframe fallback.
// onNearEnd fires at 10 s into playback (= 20 s before the estimated 30 s end).
function InstagramEmbed({
  url,
  onEnded,
  onNearEnd,
}: {
  url: string;
  onEnded: () => void;
  onNearEnd?: () => void;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nearEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const proxyUrl = `/api/instagram/oembed?url=${encodeURIComponent(url)}`;
    fetch(proxyUrl)
      .then((res) => {
        if (!res.ok) throw new Error("unavailable");
        return res.json() as Promise<{ html: string }>;
      })
      .then((data) => {
        setHtml(data.html);
        if (!document.querySelector('script[src*="instagram.com/embed.js"]')) {
          const s = document.createElement("script");
          s.src = "https://www.instagram.com/embed.js";
          s.async = true;
          document.body.appendChild(s);
        } else {
          (window as Window & { instgrm?: { Embeds?: { process(): void } } }).instgrm?.Embeds?.process();
        }
        if (onNearEnd) {
          nearEndTimerRef.current = setTimeout(onNearEnd, 10_000);
        }
        timerRef.current = setTimeout(onEnded, 30_000);
      })
      .catch(() => setFailed(true));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (nearEndTimerRef.current) clearTimeout(nearEndTimerRef.current);
    };
  }, [url, onEnded, onNearEnd]);

  if (failed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-stone-900 gap-4 p-6">
        <svg className="w-12 h-12 text-stone-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
        <p className="text-stone-400 text-sm text-center">
          Instagramの動画は<br />このページでは表示できません
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-medium rounded-full hover:opacity-90 transition-opacity"
          onClick={onEnded}
        >
          Instagramで見る
        </a>
      </div>
    );
  }

  if (html === null) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-stone-900">
        <div className="w-8 h-8 border-2 border-stone-500 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="w-full h-full overflow-auto bg-stone-900 flex items-start justify-center"
      // eslint-disable-next-line @typescript-eslint/naming-convention
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
