export type Platform = "YOUTUBE" | "INSTAGRAM";
export type ContactMethod = "LINE" | "EMAIL";
export type ContactStatus = "PENDING" | "RESPONDED" | "APPOINTED" | "CLOSED";
export type AppointmentStatus = "CONFIRMED" | "CANCELLED" | "COMPLETED";

export interface HashtagDTO {
  id: string;
  tagName: string;
  usageCount: number;
}

export interface HouseMakerDTO {
  id: string;
  name: string;
  logoUrl: string | null;
  isActive: boolean;
}

export interface VenueDTO {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
}

export interface SalespersonDTO {
  id: string;
  name: string;
  profileImage: string | null;
  toneQuote: string | null;
  profileDetail?: string | null;
  company: {
    id: string;
    name: string;
    modelHouseName: string | null;
    modelHouseAddress: string | null;
  } | null;
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
  houseMaker: HouseMakerDTO | null;
  venue: VenueDTO | null;
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

export type ArticleDifficulty = "BEGINNER" | "BASIC";
export type ArticleStatus = "DRAFT" | "PUBLISHED";

export interface LearningPhaseDTO {
  id: string;
  key: string;
  title: string;
  order: number;
  description: string | null;
}

export interface ArticleListItemDTO {
  id: string;
  order: number;
  title: string;
  estimatedMinutes: number;
  difficulty: ArticleDifficulty;
}

export interface ArticleComparisonRowDTO {
  id: string;
  priceRangeTag: string | null;
  featureTag: string | null;
  order: number;
  houseMaker: { id: string; name: string; logoUrl: string | null } | null;
}

export interface ArticleDetailDTO {
  id: string;
  phaseId: string;
  order: number;
  title: string;
  bodyMarkdown: string;
  estimatedMinutes: number;
  difficulty: ArticleDifficulty;
  translateBoxLabel: string | null;
  translateBoxValue: string | null;
  status: ArticleStatus;
  phase: { id: string; key: string; title: string };
  comparisonRows: ArticleComparisonRowDTO[];
}

export interface ViewerArticleProgressDTO {
  id: string;
  viewerId: string;
  articleId: string;
  completedAt: string | null;
}
