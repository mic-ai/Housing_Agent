"use client";

import { useRef, useEffect, useState } from "react";

interface FaceRollPlayerProps {
  src: string;
  onEnded: () => void;
}

export function FaceRollPlayer({ src, onEnded }: FaceRollPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setNeedsTap(false);
    video.play().catch(() => {
      // ブラウザのautoplay制限に引っかかった場合はタップ促進UIを表示
      setNeedsTap(true);
    });
  }, [src]);

  function handleTap() {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(console.error);
    setNeedsTap(false);
  }

  return (
    <div className="relative w-full h-full" onClick={handleTap}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        playsInline
        muted={false}
        controls={false}
        onEnded={onEnded}
        onError={onEnded}
        className="w-full h-full object-cover"
      />
      {needsTap && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 cursor-pointer">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-3">
            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <p className="text-white text-sm">タップして再生</p>
        </div>
      )}
    </div>
  );
}
