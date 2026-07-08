import Link from "next/link";
import PageShell from "@/components/PageShell";
import { APP_ROUTES } from "@/config/routes";

export default function GlobalNotFoundPage() {
  return (
    <PageShell
      title="PAGE NOT FOUND"
      subtitle="This page does not exist or is not available yet."
      badge="StatusTimer"
    >
      <section className="glass-panel rounded-3xl p-8 text-center">
        <p className="text-sm text-slate-300">
          If this game has not launched yet, its status pages are hidden until release.
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
        </div>
      </section>
    </PageShell>
  );
}
