"use client";

import { useEffect, useRef, useCallback } from "react";
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
      ) => { destroy: () => void };
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface MainVideoPlayerProps {
  platform: Platform;
  url: string;
  onEnded: () => void;
  autoPlay?: boolean;
}

export function MainVideoPlayer({
  platform,
  url,
  onEnded,
  autoPlay = true,
}: MainVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{ destroy: () => void } | null>(null);

  const initYouTube = useCallback(() => {
    const videoId = extractYouTubeId(url);
    if (!videoId || !containerRef.current) return;

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
        onStateChange: (e) => {
          if (e.data === window.YT.PlayerState.ENDED) onEnded();
        },
      },
    });
  }, [url, autoPlay, onEnded]);

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
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [platform, initYouTube]);

  if (platform === "INSTAGRAM") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <iframe
          src={`${url}embed/`}
          className="w-full h-full"
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full"
    />
  );
}
