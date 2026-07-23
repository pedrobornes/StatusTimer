import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/config/routes";
import { getUpcomingReleaseBySlug } from "@/services/releasesService";

/**
 * If the slug is a known upcoming release, send /status/... traffic there.
 * No-ops when no release exists — caller should notFound().
 */
export async function redirectToReleaseIfUpcoming(slug: string): Promise<void> {
  const release = await getUpcomingReleaseBySlug(slug).catch(() => null);
  if (!release) {
    return;
  }

  redirect(APP_ROUTES.release(release.slug || slug));
}
