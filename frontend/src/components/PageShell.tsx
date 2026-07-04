import { Sparkles } from "lucide-react";

interface PageShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
}

export default function PageShell({
  children,
  title,
  subtitle,
  badge = "Blackwatch",
}: PageShellProps) {
  return (
    <div className="mystery-grid min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <header className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs uppercase tracking-[0.35em] text-violet-200/80">
            <Sparkles className="h-3.5 w-3.5" />
            {badge}
          </div>
          <h1 className="font-[family-name:var(--font-cinzel)] text-3xl tracking-[0.08em] text-white md:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 max-w-3xl text-sm leading-7 text-violet-200/65 md:text-base">
              {subtitle}
            </p>
          ) : null}
        </header>

        {children}
      </div>
    </div>
  );
}
