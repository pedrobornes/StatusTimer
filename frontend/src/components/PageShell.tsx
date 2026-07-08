import { Sparkles } from "lucide-react";
import GameStatusCover from "@/components/ui/GameStatusCover";
import GenreBadge from "@/components/ui/GenreBadge";
import ReleaseHeroCover from "@/components/ui/ReleaseHeroCover";

interface PageShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  badges?: string[];
  coverUrl?: string | null;
  coverAlt?: string;
  heroEmphasis?: boolean;
}

export default function PageShell({
  children,
  title,
  subtitle,
  badge = "StatusTimer",
  badges,
  coverUrl,
  coverAlt,
  heroEmphasis = false,
}: PageShellProps) {
  const useGenreBadges = badges !== undefined;

  return (
    <div className="mystery-grid min-h-screen">
      {coverUrl ? (
        <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-6 md:px-8 md:pt-8">
          {heroEmphasis ? (
            <ReleaseHeroCover src={coverUrl} alt={coverAlt ?? title} />
          ) : (
            <GameStatusCover src={coverUrl} alt={coverAlt ?? title} />
          )}
        </div>
      ) : null}

      <div className="relative mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-10">
        <header className="mb-10">
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
          <h1 className="heading-display text-3xl uppercase text-white md:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
              {subtitle}
            </p>
          ) : null}
        </header>

        {children}
      </div>
    </div>
  );
}
