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
