import Link from "next/link";
import Image from "next/image";
import type { VideoDTO } from "@/types";

interface VideoCardProps {
  video: VideoDTO;
  priority?: boolean;
}

export function VideoCard({ video, priority = false }: VideoCardProps) {
  const salesperson = video.salespersonVideos[0]?.salesperson;

  return (
    <Link href={`/watch/${video.id}`} className="block group">
      <div className="relative aspect-[9/16] bg-gray-900 rounded-xl overflow-hidden">
        {video.thumbnailUrl ? (
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <span className="text-gray-400 text-4xl">&#9654;</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-sm font-medium line-clamp-2">{video.title}</p>
          {salesperson && (
            <p className="text-gray-200 text-xs mt-1">{salesperson.name}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            {video.hashtags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="text-xs text-blue-200"
              >
                #{tag.tagName}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
