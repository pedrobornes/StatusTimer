import { permanentRedirect } from "next/navigation";
import { APP_ROUTES } from "@/config/routes";
import { resolveCanonicalGameSlug } from "@/lib/gameSlugs";

/** When a game has launched, send legacy release profile URLs to status. */
export function redirectLaunchedReleaseToStatus(slug: string): never {
  permanentRedirect(APP_ROUTES.status(resolveCanonicalGameSlug(slug)));
}
