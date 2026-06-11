"use client";

import { useRef, useEffect } from "react";

interface FaceRollPlayerProps {
  src: string;
  onEnded: () => void;
}

export function FaceRollPlayer({ src, onEnded }: FaceRollPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(console.error);
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay
      playsInline
      muted={false}
      controls={false}
      onEnded={onEnded}
      className="w-full h-full object-cover"
    />
  );
}
