import type { UpcomingRelease } from "@/types/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export class ClientApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ClientApiError";
  }
}

export async function incrementReleaseHype(
  releaseId: number,
): Promise<UpcomingRelease> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/releases/${releaseId}/hype`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new ClientApiError(
      `Failed to increment hype for release ${releaseId}`,
      response.status,
    );
  }

  return response.json() as Promise<UpcomingRelease>;
}
