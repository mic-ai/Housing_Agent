export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ");
}

export function mapVideoToDTO(video: {
  id: string;
  platform: "YOUTUBE" | "INSTAGRAM";
  url: string;
  thumbnailUrl: string | null;
  title: string;
  description: string | null;
  houseMaker: { id: string; name: string; logoUrl: string | null; isActive: boolean } | null;
  venue: { id: string; name: string; address: string | null; isActive: boolean } | null;
  viewCount: number;
  createdAt: Date;
  videoHashtags: Array<{
    hashtag: { id: string; tagName: string; usageCount: number };
  }>;
  salespersonVideos: Array<{
    id: string;
    salespersonId: string;
    preRollPublicUrl: string | null;
    preRollDurationSec: number | null;
    postRollPublicUrl: string | null;
    postRollDurationSec: number | null;
    isPrimary: boolean;
    salesperson: {
      id: string;
      name: string;
      profileImage: string | null;
      bio: string | null;
      profileDetail: string | null;
      company: {
        id: string;
        name: string;
        modelHouseName: string | null;
        modelHouseAddress: string | null;
      } | null;
    };
  }>;
}) {
  return {
    id: video.id,
    platform: video.platform,
    url: video.url,
    thumbnailUrl: video.thumbnailUrl ?? (
      video.platform === "YOUTUBE"
        ? (() => { const id = extractYouTubeId(video.url); return id ? getYouTubeThumbnail(id) : null; })()
        : null
    ),
    title: video.title,
    description: video.description,
    houseMaker: video.houseMaker,
    venue: video.venue,
    viewCount: video.viewCount,
    createdAt: video.createdAt.toISOString(),
    hashtags: video.videoHashtags.map((vh) => vh.hashtag),
    salespersonVideos: video.salespersonVideos.map((sv) => ({
      id: sv.id,
      salespersonId: sv.salespersonId,
      preRollPublicUrl: sv.preRollPublicUrl,
      preRollDurationSec: sv.preRollDurationSec,
      postRollPublicUrl: sv.postRollPublicUrl,
      postRollDurationSec: sv.postRollDurationSec,
      isPrimary: sv.isPrimary,
      salesperson: sv.salesperson,
    })),
  };
}

export function extractYouTubeId(url: string): string | null {
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
