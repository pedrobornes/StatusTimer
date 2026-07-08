import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/config/routes";
import { resolveCanonicalGameSlug } from "@/lib/gameSlugs";
import { getGamingNewsBySlug } from "@/services/newsService";

interface LegacyNewsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function LegacyNewsPage({ params }: LegacyNewsPageProps) {
  const { slug } = await params;
  const article = await getGamingNewsBySlug(slug);
  const gameSlug = resolveCanonicalGameSlug(article.gameTag);

  redirect(APP_ROUTES.gameNewsArticle(gameSlug, article.slug));
}
