import { permanentRedirect } from "next/navigation";
import { APP_ROUTES } from "@/config/routes";
import { resolveCanonicalGameSlug } from "@/lib/gameSlugs";
import { resolveCanonicalNewsArticleSlug } from "@/lib/seo/newsSlugs";
import { getGamingNewsBySlug } from "@/services/newsService";

interface LegacyStatusNewsArticlePageProps {
  params: Promise<{ slug: string; newsSlug: string }>;
}

/** Permanent redirect to the canonical neutral article URL. */
export default async function LegacyStatusNewsArticlePage({
  params,
}: LegacyStatusNewsArticlePageProps) {
  const { slug, newsSlug } = await params;
  const canonicalGameSlug = resolveCanonicalGameSlug(slug);

  if (canonicalGameSlug !== slug) {
    permanentRedirect(APP_ROUTES.gameNewsArticle(canonicalGameSlug, newsSlug));
  }

  try {
    const article = await getGamingNewsBySlug(newsSlug);
    const canonicalNewsSlug = resolveCanonicalNewsArticleSlug(newsSlug, article);
    permanentRedirect(APP_ROUTES.newsArticle(canonicalNewsSlug));
  } catch {
    permanentRedirect(APP_ROUTES.newsArticle(newsSlug));
  }
}
