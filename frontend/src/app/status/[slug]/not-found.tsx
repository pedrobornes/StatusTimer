import Link from "next/link";
import PageShell from "@/components/PageShell";
import { APP_ROUTES } from "@/config/routes";

/**
 * Shown only when /status/[slug] has no catalog/status payload and no
 * upcoming release to redirect to. Keep copy soft — unknown slugs should
 * not feel like a flood of "not tracked" dead-ends.
 */
export default function StatusNotFoundPage() {
  return (
    <PageShell
      title="STATUS UNAVAILABLE"
      subtitle="We could not open a live status page for this game."
      badge="Status"
    >
      <section className="glass-panel rounded-3xl p-8 text-center">
        <p className="mx-auto max-w-lg text-sm leading-6 text-slate-300">
          The game may not be in our catalog yet, the URL may be mistyped, or
          it may still be unreleased. Upcoming titles use release pages instead
          of live server status.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={APP_ROUTES.home}
            className="inline-flex rounded-2xl border border-violet-400/25 bg-violet-500/10 px-5 py-2.5 text-sm text-violet-100 transition hover:border-violet-400/40 hover:bg-violet-500/15"
          >
            Back to Monitor
          </Link>
          <Link
            href={APP_ROUTES.releases}
            className="inline-flex rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-100"
          >
            Browse Releases
          </Link>
          <Link
            href={APP_ROUTES.games}
            className="inline-flex rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/[0.06]"
          >
            Browse Games
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
