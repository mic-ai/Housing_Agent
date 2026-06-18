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
    return <InstagramEmbed url={url} onEnded={onEnded} />;
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full"
    />
  );
}

// Instagram embed: tries the oEmbed proxy first; falls back to direct iframe.
// Duration-based onEnded timer fires after 30s (estimated) when oEmbed is active.
function InstagramEmbed({ url, onEnded }: { url: string; onEnded: () => void }) {
  const [html, setHtml] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const proxyUrl = `/api/instagram/oembed?url=${encodeURIComponent(url)}`;
    fetch(proxyUrl)
      .then((res) => {
        if (!res.ok) throw new Error("unavailable");
        return res.json() as Promise<{ html: string }>;
      })
      .then((data) => {
        setHtml(data.html);
        // Load Instagram embed.js once to process the blockquote
        if (!document.querySelector('script[src*="instagram.com/embed.js"]')) {
          const s = document.createElement("script");
          s.src = "https://www.instagram.com/embed.js";
          s.async = true;
          document.body.appendChild(s);
        } else {
          // Already loaded — trigger re-process
          (window as Window & { instgrm?: { Embeds?: { process(): void } } }).instgrm?.Embeds?.process();
        }
        // Instagram ended event is unavailable; fire after 30s as best-effort
        timerRef.current = setTimeout(onEnded, 30_000);
      })
      .catch(() => setUseFallback(true));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [url, onEnded]);

  if (useFallback || (html === null && !useFallback)) {
    // Direct iframe while loading or when oEmbed unavailable
    return (
      <div className="w-full h-full flex items-center justify-center bg-stone-900">
        <iframe
          src={`${url}embed/`}
          className="w-full h-full"
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
          title="Instagram 動画"
        />
      </div>
    );
  }

  return (
    <div
      className="w-full h-full overflow-auto bg-stone-900 flex items-start justify-center"
      // eslint-disable-next-line @typescript-eslint/naming-convention
      dangerouslySetInnerHTML={{ __html: html! }}
    />
  );
}
