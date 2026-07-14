import Link from "next/link";
import { Sparkles } from "lucide-react";
import GamePageHeroCover from "@/components/ui/GamePageHeroCover";
import GenreBadge from "@/components/ui/GenreBadge";

interface PageShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  subtitleHref?: string;
  customHeader?: React.ReactNode;
  badge?: string;
  badges?: string[];
  coverUrl?: string | null;
  coverAlt?: string;
}

export default function PageShell({
  children,
  title,
  subtitle,
  subtitleHref,
  customHeader,
  badge = "StatusTimer",
  badges,
  coverUrl,
  coverAlt,
}: PageShellProps) {
  const useGenreBadges = badges !== undefined;

  return (
    <div className="mystery-grid min-h-screen">
      {coverUrl ? (
        <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-6 md:px-8 md:pt-8">
          <GamePageHeroCover src={coverUrl} alt={coverAlt ?? title} />
        </div>
      ) : null}

      <div className="relative mx-auto w-full max-w-[1400px] px-4 py-5 sm:py-6 md:px-8 md:py-10">
        <header className="mb-6 md:mb-10">
          {customHeader ? (
            customHeader
          ) : (
            <>
              {useGenreBadges ? (
                badges!.length > 0 ? (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {badges!.map((genre) => (
                      <GenreBadge key={genre} label={genre} />
                    ))}
                  </div>
                ) : null
              ) : (
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.35em] text-violet-100/90">
                  <Sparkles className="h-3.5 w-3.5" />
                  {badge}
                </div>
              )}
              <h1 className="heading-display text-2xl uppercase text-white sm:text-3xl md:text-4xl">
                {title}
              </h1>
              {subtitle ? (
                subtitleHref ? (
                  <Link
                    href={subtitleHref}
                    className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm font-medium text-violet-100/90 transition hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-white"
                  >
                    {subtitle}
                  </Link>
                ) : (
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                    {subtitle}
                  </p>
                )
              ) : null}
            </>
          )}
        </header>

        {children}
      </div>
    </div>
  );
}
