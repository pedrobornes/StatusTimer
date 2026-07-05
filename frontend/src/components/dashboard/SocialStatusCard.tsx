import { Radio } from "lucide-react";
import { formatLocalizedTimestamp } from "@/utils/dateFormatter";
import { resolveSocialServiceBrand } from "@/lib/socialServices";
import type { ServerStatus } from "@/types/api";

interface SocialStatusCardProps {
  status: ServerStatus;
}

export default function SocialStatusCard({ status }: SocialStatusCardProps) {
  const brand = resolveSocialServiceBrand(status.serviceSlug);
  const isOnline = status.isUp;
  const label = brand?.label ?? status.serviceName;
  const initials = brand?.initials ?? status.serviceName.slice(0, 2).toUpperCase();
  const description = brand?.description ?? "Social platform connectivity";

  return (
    <article
      className={`rounded-2xl border bg-white/[0.04] p-5 transition hover:bg-white/[0.06] ${
        brand?.ringClass ?? "border-white/8 hover:border-fuchsia-400/25"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br text-xs font-bold uppercase tracking-wider ${
              brand?.accentClass ??
              "from-fuchsia-500/20 to-fuchsia-900/10 text-fuchsia-100 border-fuchsia-400/25"
            }`}
            aria-hidden
          >
            {initials}
          </div>

          <div className="min-w-0">
            <h4 className="text-base font-semibold text-white">{label}</h4>
            <p className="mt-1 text-xs text-slate-400">{description}</p>
            <span className="mt-2 inline-flex rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-fuchsia-200/90">
              Social
            </span>
          </div>
        </div>

        <div
          className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
            isOnline
              ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20"
              : "bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/20"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isOnline
                ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                : "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.8)]"
            }`}
          />
          {isOnline ? "Online" : "Offline"}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Radio className="h-3.5 w-3.5" />
        <time dateTime={status.lastChecked}>
          Last checked {formatLocalizedTimestamp(status.lastChecked)}
        </time>
      </div>
    </article>
  );
}
