"use client";

import { useState, useCallback } from "react";
import { VideoCard } from "./VideoCard";
import { VideoCardSkeleton } from "./VideoCardSkeleton";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import type { VideoDTO } from "@/types";

interface VideoFeedClientProps {
  initialVideos: VideoDTO[];
  tag?: string;
  q?: string;
}

function EmptyState({ tag, q }: { tag?: string; q?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-5 border border-white/10">
        <svg
          className="w-10 h-10 text-stone-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
          />
        </svg>
      </div>
      <p className="text-stone-300 text-lg font-medium mb-2">動画が見つかりませんでした</p>
      {tag && (
        <p className="text-stone-500 text-sm">「#{tag}」に一致する動画はありません</p>
      )}
      {q && !tag && (
        <p className="text-stone-500 text-sm">「{q}」の検索結果はありません</p>
      )}
      {!tag && !q && (
        <p className="text-stone-500 text-sm">まだ動画が登録されていません</p>
      )}
    </div>
  );
}

const SKELETON_COUNT = 6;

export function VideoFeedClient({
  initialVideos,
  tag,
  q,
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
      const res = await fetch(`/api/videos?${params}`);
      const json = await res.json();
      setVideos((prev) => [...prev, ...json.data]);
      setCursor(json.nextCursor);
      setHasMore(json.nextCursor !== null);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, cursor, tag, q]);

  const sentinelRef = useIntersectionObserver(loadMore, { threshold: 0.1 });

  if (videos.length === 0) {
    return <EmptyState tag={tag} q={q} />;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video, index) => (
          <VideoCard key={video.id} video={video} priority={index < 2} />
        ))}
        {loading &&
          Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <VideoCardSkeleton key={`skeleton-${i}`} />
          ))}
      </div>

      <div ref={sentinelRef} className="h-8 mt-4" aria-hidden="true" />
    </>
  );
}
