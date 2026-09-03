import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import GameNewsArticleView from "@/components/GameNewsArticleView";
import JsonLdScript from "@/components/seo/JsonLdScript";
import { APP_ROUTES } from "@/config/routes";
import { getSiteUrl } from "@/config/site";
import { resolveCanonicalGameSlug } from "@/lib/gameSlugs";
import {
  cleanNewsDisplayTitle,
  resolveNewsGameName,
} from "@/lib/intelFeed";
import { resolveNewsArticleAssets } from "@/lib/newsArticleAssets";
import { resolveNewsGameContext } from "@/lib/newsRoutes";
import { buildNewsArticleJsonLd } from "@/lib/seo/jsonLd";
import { isIndexableNewsContent } from "@/lib/seo/newsIndexability";
import {
  buildNewsArticleDescription,
  buildNewsArticleMetadata,
  buildNewsArticleTitle,
} from "@/lib/seo/newsMetadata";
import { resolveCanonicalNewsArticleSlug } from "@/lib/seo/newsSlugs";
import { getGamingNewsBySlug } from "@/services/newsService";
import { getUpcomingReleases } from "@/services/releasesService";
import { getGameStatusDetail } from "@/services/telemetryService";

export const revalidate = 120;

interface NewsArticlePageProps {
  params: Promise<{ slug: string }>;
}

async function loadNewsArticle(slug: string) {
  const article = await getGamingNewsBySlug(slug);
  const canonicalSlug = resolveCanonicalNewsArticleSlug(slug, article);

  return { article, canonicalSlug };
}

export async function generateMetadata({
  params,
}: NewsArticlePageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { article, canonicalSlug } = await loadNewsArticle(slug);
    return buildNewsArticleMetadata(article, canonicalSlug);
  } catch {
    return { title: "News | StatusTimer" };
  }
}

export default async function NewsArticlePage({ params }: NewsArticlePageProps) {
  const { slug: newsSlug } = await params;
  const siteUrl = getSiteUrl();

  try {
    const { article, canonicalSlug } = await loadNewsArticle(newsSlug);

    if (canonicalSlug !== newsSlug) {
      permanentRedirect(APP_ROUTES.newsArticle(canonicalSlug));
    }

    const gameSlug = resolveCanonicalGameSlug(article.gameTag);
    const gameName = resolveNewsGameName(article);
    const displayTitle = cleanNewsDisplayTitle(article.title, article.gameTag);
    const pageUrl = `${siteUrl}${APP_ROUTES.newsArticle(canonicalSlug)}`;
    const indexable = isIndexableNewsContent(article.content);
    const pageTitle = buildNewsArticleTitle(article, gameName, displayTitle);
    const pageDescription = buildNewsArticleDescription(article, gameName);

    const [releases, statusDetail] = await Promise.all([
      getUpcomingReleases().catch(() => []),
      getGameStatusDetail(gameSlug).catch(() => null),
    ]);

    const releaseEntry =
      releases.find((release) => release.slug === gameSlug) ?? null;

    const context = resolveNewsGameContext(
      gameSlug,
      releases,
      statusDetail?.telemetry ?? null,
    );

    const { heroUrl, boxArtUrl } = resolveNewsArticleAssets(gameSlug, article, {
      release: releaseEntry,
      telemetry: statusDetail?.telemetry ?? null,
    });

    const jsonLd = indexable
      ? buildNewsArticleJsonLd({
          headline: pageTitle,
          description: pageDescription,
          pageUrl,
          siteUrl,
          gameName,
          gameStatusUrl: `${siteUrl}${APP_ROUTES.status(gameSlug)}`,
          publishedAt: article.publishedAt ?? article.createdAt,
          modifiedAt: article.createdAt,
        })
      : null;

    return (
      <>
        {jsonLd ? <JsonLdScript data={jsonLd} /> : null}
        <GameNewsArticleView
          article={article}
          context={context}
          heroUrl={heroUrl}
          boxArtUrl={boxArtUrl}
          statusDetail={statusDetail}
        />
      </>
    );
  } catch {
    notFound();
  }
}
