"use client";

import { useRef, useState } from "react";

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

type IntroVideo = {
  url: string;
  durationSec: number | null;
};

export function IntroVideoUploader({
  initialUrl,
  initialDurationSec,
}: {
  initialUrl: string | null;
  initialDurationSec: number | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [video, setVideo] = useState<IntroVideo | null>(
    initialUrl ? { url: initialUrl, durationSec: initialDurationSec } : null
  );
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      setError("動画ファイル（MP4/WebM/MOV）を選択してください");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/salesperson/profile/intro-video", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "アップロードに失敗しました");
        return;
      }
      setVideo({ url: json.data.introVideoUrl, durationSec: json.data.introVideoDurationSec });
    } catch {
      setError("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/salesperson/profile/intro-video", { method: "DELETE" });
      if (res.ok) setVideo(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      {video ? (
        <div className="bg-gray-800 rounded-lg p-3 space-y-2 max-w-xs">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={video.url} className="w-full rounded" controls muted />
          <div className="flex items-center justify-between">
            {video.durationSec !== null && <p className="text-xs text-gray-300">{video.durationSec}秒</p>}
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50"
            >
              {deleting ? "削除中..." : "削除"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500">登録なし</p>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="px-3 py-1.5 border border-dashed border-gray-500 hover:border-gray-300 rounded text-xs text-gray-400 hover:text-gray-200 disabled:opacity-50 transition-colors"
      >
        {uploading ? "アップロード中..." : video ? "動画を差し替える（30秒以内）" : "自己紹介動画を追加（30秒以内）"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
