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

export interface UpcomingRelease {
  id: number;
  gameName: string;
  releaseDate: string;
  hypeCount: number;
  genre?: "FPS" | "RPG" | "Survival" | "Sports";
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  isReleased: boolean;
}
