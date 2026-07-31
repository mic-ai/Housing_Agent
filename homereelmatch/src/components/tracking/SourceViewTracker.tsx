"use client";

import { useEffect } from "react";

interface SourceViewTrackerProps {
  source?: string;
  videoId?: string;
}

// QRコード等の流入元(source)をVisitorVideoViewとして記録する（fire-and-forget）
export function SourceViewTracker({ source, videoId }: SourceViewTrackerProps) {
  useEffect(() => {
    if (!source) return;
    fetch("/api/visitor-video-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, videoId }),
    }).catch(() => {});
  }, [source, videoId]);

  return null;
}
