"use client";

import { useState } from "react";
import { Radio } from "lucide-react";
import StatusCheckTime from "@/components/ui/StatusCheckTime";
import { resolveSocialServiceBrand } from "@/lib/socialServices";
import type { ServerStatus } from "@/types/api";

interface SocialStatusCardProps {
  status: ServerStatus;
  /** Condensed layout for sidebars: hides description and the "Social" badge. */
  compact?: boolean;
}

export default function SocialStatusCard({
  status,
  compact = false,
}: SocialStatusCardProps) {
  const brand = resolveSocialServiceBrand(status.serviceSlug);
  const [logoFailed, setLogoFailed] = useState(false);
  const isOnline = status.isUp;
  const label = brand?.label ?? status.serviceName;
  const initials = brand?.initials ?? status.serviceName.slice(0, 2).toUpperCase();
  const description = brand?.description ?? "Social platform connectivity";
  const showLogo = Boolean(brand?.logoUrl) && !logoFailed;

  if (compact) {
    return (
      <article
        className={`flex items-center gap-3 rounded-2xl border bg-white/[0.04] p-3 transition hover:bg-white/[0.06] ${
          brand?.ringClass ?? "border-white/8 hover:border-fuchsia-400/25"
        }`}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-gradient-to-br ${
            brand?.accentClass ??
            "from-fuchsia-500/20 to-fuchsia-900/10 text-fuchsia-100 border-fuchsia-400/25"
          }`}
        >
          {showLogo ? (
            <img
              src={brand!.logoUrl}
              alt=""
              className="h-6 w-6 object-contain"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider" aria-hidden>
              {initials}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-white">{label}</h4>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Radio className="h-3 w-3 shrink-0" />
            <StatusCheckTime
              value={status.lastChecked}
              className="truncate"
            />
          </div>
        </div>

        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            isOnline
              ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20"
              : "bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/20"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isOnline
                ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                : "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.8)]"
            }`}
          />
          {isOnline ? "Online" : "Down"}
        </span>
      </article>
    );
  }

  return (
    <article
      className={`rounded-2xl border bg-white/[0.04] p-5 transition hover:bg-white/[0.06] ${
        brand?.ringClass ?? "border-white/8 hover:border-fuchsia-400/25"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-gradient-to-br ${
              brand?.accentClass ??
              "from-fuchsia-500/20 to-fuchsia-900/10 text-fuchsia-100 border-fuchsia-400/25"
            }`}
          >
            {showLogo ? (
              <img
                src={brand!.logoUrl}
                alt=""
                className="h-8 w-8 object-contain"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <span
                className="text-xs font-bold uppercase tracking-wider"
                aria-hidden
              >
                {initials}
              </span>
            )}
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
        <StatusCheckTime value={status.lastChecked} />
      </div>
    </article>
  );
}
