import { Sparkles } from "lucide-react";
import GameStatusCover from "@/components/ui/GameStatusCover";

interface PageShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  coverUrl?: string | null;
  coverAlt?: string;
}

export default function PageShell({
  children,
  title,
  subtitle,
  badge = "Blackwatch",
  coverUrl,
  coverAlt,
}: PageShellProps) {
  return (
    <div className="mystery-grid min-h-screen">
      {coverUrl ? (
        <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-6 md:px-8 md:pt-8">
          <GameStatusCover src={coverUrl} alt={coverAlt ?? title} />
        </div>
      ) : null}

      <div className="relative mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-10">
        <header className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.35em] text-violet-100/90">
            <Sparkles className="h-3.5 w-3.5" />
            {badge}
          </div>
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
