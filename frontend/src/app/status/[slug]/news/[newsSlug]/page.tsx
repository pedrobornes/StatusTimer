import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/config/routes";
import { resolveCanonicalGameSlug } from "@/lib/gameSlugs";

interface LegacyStatusNewsArticlePageProps {
  params: Promise<{ slug: string; newsSlug: string }>;
}

/** Permanent redirect to the canonical neutral article URL. */
export default async function LegacyStatusNewsArticlePage({
  params,
}: LegacyStatusNewsArticlePageProps) {
  const { slug, newsSlug } = await params;
  const canonicalSlug = resolveCanonicalGameSlug(slug);

  if (canonicalSlug !== slug) {
    redirect(APP_ROUTES.gameNewsArticle(canonicalSlug, newsSlug));
  }

  redirect(APP_ROUTES.newsArticle(newsSlug));
}
