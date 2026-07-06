import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { APP_ROUTES } from "@/config/routes";
import { formatSlugLabel } from "@/lib/telemetry";
import { fetchIndexableSlugs } from "@/services/catalogService";

export const metadata: Metadata = {
  title: "Live Game Server Status Index",
  description:
    "Browse indexable live server status pages for multiplayer games tracked by StatusTimer.",
  alternates: {
    canonical: "/status",
  },
};

export const revalidate = 3600;

export default async function StatusIndexPage() {
  const slugs = await fetchIndexableSlugs().catch(() => []);

  return (
    <PageShell
      badge="Server Status Index"
      title="Live Game Server Status"
      subtitle="Money pages with fresh telemetry and live outage data. Only games with real monitoring signals appear here."
    >
      {slugs.length === 0 ? (
        <p className="text-sm leading-7 text-slate-400">
          No indexable status pages are available yet. Check back after telemetry
          sync completes.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {slugs.map((entry) => (
            <li key={entry.slug}>
              <Link
                href={APP_ROUTES.status(entry.slug)}
                className="block rounded-xl border border-white/10 bg-[#1a162b]/40 px-4 py-3 text-sm text-slate-200 transition hover:border-violet-400/40 hover:bg-violet-500/10"
              >
                <span className="font-medium text-white">
                  {formatSlugLabel(entry.slug)}
                </span>
                <span className="mt-1 block text-xs uppercase tracking-[0.2em] text-slate-500">
                  {entry.slug}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
