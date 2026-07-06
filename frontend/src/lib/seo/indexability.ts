import type { GameTelemetry } from "@/types/telemetry";

export type LifecycleState = "CATALOG" | "MONITORED" | "INDEXABLE";

export function isIndexableTelemetry(telemetry: GameTelemetry): boolean {
  if (telemetry.isIndexable === true) {
    return true;
  }

  if (telemetry.isIndexable === false) {
    return false;
  }

  if (telemetry.lifecycleState === "CATALOG") {
    return false;
  }

  return false;
}

export function buildRobotsDirective(indexable: boolean) {
  return {
    index: indexable,
    follow: true,
    googleBot: {
      index: indexable,
      follow: true,
      "max-snippet": -1 as const,
      "max-image-preview": "large" as const,
    },
  };
}
