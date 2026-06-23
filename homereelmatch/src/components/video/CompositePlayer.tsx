"use client";

import { useState, useCallback } from "react";
import { FaceRollPlayer } from "./FaceRollPlayer";
import { MainVideoPlayer } from "./MainVideoPlayer";
import type { Platform } from "@/types";

type PlaybackPhase = "PRE_ROLL" | "MAIN" | "POST_ROLL" | "ENDED";

interface CompositePlayerProps {
  platform: Platform;
  url: string;
  preRollUrl?: string | null;
  postRollUrl?: string | null;
  onEnded?: () => void;
}

export function CompositePlayer({
  platform,
  url,
  preRollUrl,
  postRollUrl,
  onEnded,
}: CompositePlayerProps) {
  const initialPhase: PlaybackPhase = preRollUrl ? "PRE_ROLL" : "MAIN";
  const [phase, setPhase] = useState<PlaybackPhase>(initialPhase);

  const handlePreRollEnded = useCallback(() => {
    setPhase("MAIN");
  }, []);

  const handleMainEnded = useCallback(() => {
    if (postRollUrl) {
      setPhase("POST_ROLL");
    } else {
      setPhase("ENDED");
      onEnded?.();
    }
  }, [postRollUrl, onEnded]);

  const handlePostRollEnded = useCallback(() => {
    setPhase("ENDED");
    onEnded?.();
  }, [onEnded]);

  return (
    <div className="relative w-full h-full bg-black">
      {phase === "PRE_ROLL" && preRollUrl && (
        <FaceRollPlayer src={preRollUrl} onEnded={handlePreRollEnded} />
      )}
      {phase === "MAIN" && (
        <MainVideoPlayer
          platform={platform}
          url={url}
          onEnded={handleMainEnded}
          autoPlay
        />
      )}
      {phase === "POST_ROLL" && postRollUrl && (
        <FaceRollPlayer src={postRollUrl} onEnded={handlePostRollEnded} />
      )}
      {phase === "ENDED" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <p className="text-white text-lg">再生終了</p>
        </div>
      )}

      {(phase === "PRE_ROLL" || phase === "POST_ROLL") && (
        <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {phase === "PRE_ROLL" ? "担当者より" : "担当者より"}
        </div>
      )}
    </div>
  );
}
