export type ServiceCategory = "GAMING" | "SOCIAL";

export interface ServerStatus {
  id: number;
  serviceName: string;
  serviceSlug: string;
  category: ServiceCategory;
  isUp: boolean;
  lastChecked: string;
}

export interface GamingNews {
  id: number;
  slug: string;
  title: string;
  content: string;
  gameTag: string;
  gameCoverUrl?: string | null;
  createdAt: string;
  publishedAt?: string;
}

export type GamePlatform = "PC" | "PS5" | "XBOX" | "SWITCH" | "SWITCH_2";

export type GameGenre =
  | "Shooter"
  | "RPG"
  | "Survival"
  | "Action"
  | "Sports/Racing"
  | "Strategy";

export interface PlatformDetail {
  platform: GamePlatform;
  releaseDate: string | null;
}

export interface UpcomingRelease {
  id: number;
  gameName: string;
  slug: string;
  genre: GameGenre;
  releaseDate: string;
  hypeCount: number;
  imageUrl?: string | null;
  logoUrl?: string | null;
  igdbGameId?: number | null;
  userRating?: number | null;
  criticRating?: number | null;
  screenshotUrls?: string[];
  trailerVideoIds?: string[];
  platforms: PlatformDetail[];
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  isReleased: boolean;
}
