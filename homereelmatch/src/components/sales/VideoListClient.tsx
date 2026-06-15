"use client";

import Link from "next/link";

interface VideoItem {
  id: string;
  title: string;
  platform: "YOUTUBE" | "INSTAGRAM";
  thumbnailUrl: string | null;
  viewCount: number;
  isActive: boolean;
  hashtags: { id: string; tagName: string; usageCount: number }[];
  salespersonVideoCount: number;
}

interface Props {
  videos: VideoItem[];
  salespersonId: string;
}

export function VideoListClient({ videos, salespersonId }: Props) {
  if (videos.length === 0) {
    return (
      <p className="text-center text-gray-500 py-12">動画がありません</p>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {videos.map((video) => (
        <div key={video.id} className="flex items-center gap-4 py-4">
          {video.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-24 h-16 object-cover rounded"
            />
          ) : (
            <div className="w-24 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
              {video.platform}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{video.title}</p>
            <p className="text-sm text-gray-500">視聴数: {video.viewCount}</p>
            {video.hashtags.map((h) => (
              <span key={h.id} className="text-xs text-blue-600 mr-1">#{h.tagName}</span>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {!video.isActive && (
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">非公開</span>
            )}
            <Link
              href={`/dashboard/videos/${video.id}/edit?salespersonId=${salespersonId}`}
              className="text-sm text-blue-600 hover:underline"
            >
              顔出し設定
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
