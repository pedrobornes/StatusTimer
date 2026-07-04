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
}

export interface PlatformRelease {
  platform: string;
  releaseDate: string | null;
}

export interface UpcomingRelease {
  id: number;
  gameName: string;
  slug: string;
  genre: string;
  releaseDate: string;
  hypeCount: number;
  platforms: PlatformRelease[];
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  isReleased: boolean;
}
