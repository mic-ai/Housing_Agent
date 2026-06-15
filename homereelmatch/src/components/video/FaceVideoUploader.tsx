"use client";

import { useRef, useState } from "react";

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

interface UploadResult {
  salespersonVideoId: string;
  publicUrl: string;
  durationSec: number;
  type: "pre" | "post";
}

interface Props {
  salespersonId: string;
  videoId: string;
  type: "pre" | "post";
  currentPublicUrl?: string;
  onUploadComplete: (result: UploadResult) => void;
}

export function FaceVideoUploader({ salespersonId, videoId, type, currentPublicUrl, onUploadComplete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
      fd.append("salespersonId", salespersonId);
      fd.append("videoId", videoId);
      fd.append("type", type);

      const res = await fetch("/api/face-videos/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "アップロードに失敗しました");
        return;
      }
      onUploadComplete(data as UploadResult);
    } catch {
      setError("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-3">
      {currentPublicUrl && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video role="video" src={currentPublicUrl} controls className="w-full rounded-lg" />
      )}

      <div
        data-testid="drop-zone"
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
      >
        <p className="text-sm text-gray-600 mb-2">ドラッグ＆ドロップ または</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          ファイルを選択
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={onFileInputChange}
        />
      </div>

      {uploading && (
        <div role="progressbar" aria-label="アップロード中" className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse w-full" />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
