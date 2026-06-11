"use client";

import { useState, useEffect, useCallback } from "react";
import type { VideoDTO } from "@/types";

interface UseVideoFeedOptions {
  tag?: string;
  area?: string;
  q?: string;
  limit?: number;
}

export function useVideoFeed(options: UseVideoFeedOptions = {}) {
  const [videos, setVideos] = useState<VideoDTO[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const buildUrl = useCallback(
    (nextCursor?: string) => {
      const params = new URLSearchParams();
      if (options.tag) params.set("tag", options.tag);
      if (options.area) params.set("area", options.area);
      if (options.q) params.set("q", options.q);
      if (options.limit) params.set("limit", String(options.limit));
      if (nextCursor) params.set("cursor", nextCursor);
      return `/api/videos?${params.toString()}`;
    },
    [options.tag, options.area, options.q, options.limit]
  );

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetch(buildUrl(cursor ?? undefined));
      const json = await res.json();
      setVideos((prev) => [...prev, ...json.data]);
      setCursor(json.nextCursor);
      setHasMore(json.nextCursor !== null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, cursor, buildUrl]);

  useEffect(() => {
    setVideos([]);
    setCursor(null);
    setHasMore(true);
  }, [options.tag, options.area, options.q]);

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.tag, options.area, options.q]);

  return { videos, loading, hasMore, loadMore };
}
