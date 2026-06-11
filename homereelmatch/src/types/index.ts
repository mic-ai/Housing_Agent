export type Platform = "YOUTUBE" | "INSTAGRAM";
export type ContactMethod = "LINE" | "EMAIL";
export type ContactStatus = "PENDING" | "RESPONDED" | "APPOINTED" | "CLOSED";
export type AppointmentStatus = "CONFIRMED" | "CANCELLED" | "COMPLETED";

export interface HashtagDTO {
  id: string;
  tagName: string;
  usageCount: number;
}

export interface SalespersonDTO {
  id: string;
  name: string;
  profileImage: string | null;
  bio: string | null;
  company: {
    id: string;
    name: string;
    modelHouseName: string | null;
    modelHouseAddress: string | null;
  };
}

export interface SalespersonVideoDTO {
  id: string;
  salespersonId: string;
  preRollPublicUrl: string | null;
  preRollDurationSec: number | null;
  postRollPublicUrl: string | null;
  postRollDurationSec: number | null;
  isPrimary: boolean;
  salesperson: SalespersonDTO;
}

export interface VideoDTO {
  id: string;
  platform: Platform;
  url: string;
  thumbnailUrl: string | null;
  title: string;
  description: string | null;
  area: string | null;
  houseType: string | null;
  priceRange: string | null;
  viewCount: number;
  hashtags: HashtagDTO[];
  salespersonVideos: SalespersonVideoDTO[];
  createdAt: string;
}

export interface VideoListResponseDTO {
  data: VideoDTO[];
  nextCursor: string | null;
}

export interface ContactRequestDTO {
  id: string;
  salespersonId: string;
  videoId: string | null;
  contactMethod: ContactMethod;
  questionnaireJson: Record<string, unknown> | null;
  status: ContactStatus;
  createdAt: string;
}

export interface AppointmentDTO {
  id: string;
  contactRequestId: string;
  salespersonId: string;
  scheduledAt: string;
  modelHouseId: string | null;
  status: AppointmentStatus;
}

export interface AvailableSlotDTO {
  id: string;
  salespersonId: string;
  startAt: string;
  endAt: string;
  isBooked: boolean;
}

export interface EmbedVideoDTO {
  id: string;
  platform: Platform;
  url: string;
  thumbnailUrl: string | null;
  title: string;
  hashtags: string[];
}
