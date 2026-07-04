import Link from "next/link";
import PageShell from "@/components/PageShell";

export default function ReleaseNotFound() {
  return (
    <PageShell
      title="PROFILE NOT FOUND"
      subtitle="No release profile matches this route slug. The target may not be indexed yet."
      badge="Release"
    >
      <div className="glass-panel rounded-3xl p-8 text-center">
        <p className="text-sm text-violet-200/60">
          [ROUTE MISS] Verify the slug or return to the main monitor to browse
          tracked releases.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-2xl border border-violet-400/25 bg-violet-500/10 px-5 py-2.5 text-sm text-violet-100 transition hover:border-violet-400/40 hover:bg-violet-500/15"
        >
          Back to Monitor
        </Link>
      </div>
    </PageShell>
  );
}
