export type ServiceCategory = "GAMING" | "SOCIAL" | "STREAMING";

export interface ServerStatus {
  id: number;
  serviceName: string;
  category: ServiceCategory;
  isUp: boolean;
  lastChecked: string;
}

export interface GamingNews {
  id: number;
  title: string;
  content: string;
  gameTag: string;
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
  platforms: PlatformDetail[];
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  isReleased: boolean;
}
