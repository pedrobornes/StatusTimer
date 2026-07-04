import type { CountdownParts } from "@/types/api";

export function getCountdownParts(
  releaseDate: string | null,
  now: number = Date.now(),
): CountdownParts {
  if (releaseDate === null) {
    return { days: 0, hours: 0, minutes: 0, isReleased: false };
  }

  const targetTime = new Date(releaseDate).getTime();
  const difference = targetTime - now;

  if (Number.isNaN(targetTime) || difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, isReleased: true };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((difference / (1000 * 60)) % 60);

  return { days, hours, minutes, isReleased: false };
}

export function formatReleaseDate(releaseDate: string | null): string {
  if (releaseDate === null) {
    return "TBA";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(releaseDate));
}
