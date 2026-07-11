import { ApiError } from "@/services/api";
import { ClientApiError } from "@/services/releasesClientService";

export type UserErrorContext =
  | "search"
  | "dashboard"
  | "games"
  | "releases"
  | "release"
  | "status"
  | "updates"
  | "hype";

const CONTEXT_MESSAGES: Record<UserErrorContext, string> = {
  search:
    "We couldn't search the catalog right now. Please try again in a moment.",
  dashboard:
    "We couldn't load the dashboard right now. Please refresh and try again.",
  games:
    "We couldn't load game status right now. Please refresh and try again.",
  releases:
    "We couldn't load upcoming releases right now. Please refresh and try again.",
  release:
    "We couldn't load this release page right now. Please refresh and try again.",
  status:
    "We couldn't load live status for this game right now. Please try again.",
  updates:
    "We couldn't load the latest updates right now. Please try again.",
  hype: "We couldn't save your hype right now. Please try again.",
};

const NETWORK_MESSAGE =
  "We couldn't reach StatusTimer right now. Check your connection and try again.";

const SERVER_MESSAGE =
  "Something went wrong on our end. Please try again in a moment.";

/**
 * Maps API/network failures to copy safe for end users (no backend jargon).
 */
export function resolveUserFacingError(
  error: unknown,
  context: UserErrorContext = "search",
): string {
  const fallback = CONTEXT_MESSAGES[context];

  if (error instanceof ApiError || error instanceof ClientApiError) {
    if (error.status >= 500) {
      return SERVER_MESSAGE;
    }

    return fallback;
  }

  if (error instanceof TypeError) {
    return NETWORK_MESSAGE;
  }

  return fallback;
}

/** @deprecated Prefer {@link resolveUserFacingError} with an explicit context. */
export function getUserFacingErrorMessage(error: unknown): string {
  return resolveUserFacingError(error, "search");
}
