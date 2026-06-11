"use client";

import { useState, useCallback } from "react";
import { VideoCard } from "./VideoCard";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import type { VideoDTO } from "@/types";

interface VideoFeedClientProps {
  initialVideos: VideoDTO[];
  tag?: string;
  q?: string;
  area?: string;
}

export function VideoFeedClient({
  initialVideos,
  tag,
  q,
  area,
}: VideoFeedClientProps) {
  const [videos, setVideos] = useState<VideoDTO[]>(initialVideos);
  const [cursor, setCursor] = useState<string | null>(
    initialVideos.length === 20 ? initialVideos[initialVideos.length - 1].id : null
  );
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialVideos.length === 20);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !cursor) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ cursor, limit: "20" });
      if (tag) params.set("tag", tag);
      if (q) params.set("q", q);
      if (area) params.set("area", area);
      const res = await fetch(`/api/videos?${params}`);
      const json = await res.json();
      setVideos((prev) => [...prev, ...json.data]);
      setCursor(json.nextCursor);
      setHasMore(json.nextCursor !== null);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, cursor, tag, q, area]);

  const sentinelRef = useIntersectionObserver(loadMore, { threshold: 0.1 });

  if (videos.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg">動画が見つかりませんでした</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      <div ref={sentinelRef} className="h-8 mt-4">
        {loading && (
          <div className="flex justify-center">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>
    </>
  );
}
