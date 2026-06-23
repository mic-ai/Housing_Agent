"use client";

import { useState, useCallback } from "react";
import { CompositePlayer } from "./CompositePlayer";
import { VideoFooter } from "./VideoFooter";
import type { Platform, SalespersonVideoDTO, HashtagDTO } from "@/types";

interface WatchClientShellProps {
  platform: Platform;
  url: string;
  preRollUrl?: string | null;
  postRollUrl?: string | null;
  videoId: string;
  title: string;
  hashtags: HashtagDTO[];
  salespersonVideo: SalespersonVideoDTO | null;
}

export function WatchClientShell({
  platform,
  url,
  preRollUrl,
  postRollUrl,
  videoId,
  title,
  hashtags,
  salespersonVideo,
}: WatchClientShellProps) {
  const [showContact, setShowContact] = useState(false);
  const handleShowContact = useCallback(() => setShowContact(true), []);

  return (
    <>
      <CompositePlayer
        platform={platform}
        url={url}
        preRollUrl={preRollUrl}
        postRollUrl={postRollUrl}
        onShowContact={handleShowContact}
      />
      <VideoFooter
        videoId={videoId}
        title={title}
        hashtags={hashtags}
        salespersonVideo={salespersonVideo}
        showContact={showContact}
      />
    </>
  );
}
