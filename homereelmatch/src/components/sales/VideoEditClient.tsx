"use client";

import { useState } from "react";
import { FaceVideoUploader } from "@/components/video/FaceVideoUploader";
import { CompositePlayer } from "@/components/video/CompositePlayer";
// salespersonId は将来の拡張用に保持
// eslint-disable-next-line @typescript-eslint/no-unused-vars

interface SalespersonVideoData {
  id: string;
  preRollPublicUrl: string | null;
  preRollDurationSec: number | null;
  postRollPublicUrl: string | null;
  postRollDurationSec: number | null;
  isPrimary: boolean;
}

interface VideoData {
  id: string;
  title: string;
  platform: "YOUTUBE" | "INSTAGRAM";
  url: string;
  thumbnailUrl: string | null;
}

interface Props {
  video: VideoData;
  salespersonId: string;
  initialSalespersonVideo: SalespersonVideoData | null;
}

export function VideoEditClient({ video, salespersonId, initialSalespersonVideo }: Props) {
  const [svData, setSvData] = useState<SalespersonVideoData | null>(initialSalespersonVideo);
  const [showPreview, setShowPreview] = useState(false);

  function handleUploadComplete(result: {
    salespersonVideoId: string;
    publicUrl: string;
    durationSec: number;
    type: "pre" | "post";
  }) {
    setSvData((prev) => {
      const base = prev ?? {
        id: result.salespersonVideoId,
        preRollPublicUrl: null,
        preRollDurationSec: null,
        postRollPublicUrl: null,
        postRollDurationSec: null,
        isPrimary: false,
      };
      if (result.type === "pre") {
        return { ...base, id: result.salespersonVideoId, preRollPublicUrl: result.publicUrl, preRollDurationSec: result.durationSec };
      } else {
        return { ...base, id: result.salespersonVideoId, postRollPublicUrl: result.publicUrl, postRollDurationSec: result.durationSec };
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="bg-gray-900 rounded-xl p-5 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-gray-300 mb-3">
            プリロール（本編前・最大6秒）
          </h2>
          <FaceVideoUploader
            salespersonId={salespersonId}
            videoId={video.id}
            type="pre"
            currentPublicUrl={svData?.preRollPublicUrl ?? undefined}
            onUploadComplete={handleUploadComplete}
          />
          {svData?.preRollDurationSec && (
            <p className="text-xs text-gray-500 mt-1">尺: {svData.preRollDurationSec}秒</p>
          )}
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-300 mb-3">
            ポストロール（本編後・最大6秒）
          </h2>
          <FaceVideoUploader
            salespersonId={salespersonId}
            videoId={video.id}
            type="post"
            currentPublicUrl={svData?.postRollPublicUrl ?? undefined}
            onUploadComplete={handleUploadComplete}
          />
          {svData?.postRollDurationSec && (
            <p className="text-xs text-gray-500 mt-1">尺: {svData.postRollDurationSec}秒</p>
          )}
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-300">再生プレビュー</h2>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm px-4 py-1.5 border border-gray-700 text-gray-300 rounded hover:bg-gray-800"
          >
            {showPreview ? "閉じる" : "プレビュー表示"}
          </button>
        </div>
        {showPreview && (
          <CompositePlayer
            platform={video.platform}
            url={video.url}
            preRollUrl={svData?.preRollPublicUrl}
            postRollUrl={svData?.postRollPublicUrl}
          />
        )}
      </div>
    </div>
  );
}
