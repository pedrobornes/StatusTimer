import { Activity, BarChart3, Clock3, ShieldCheck } from "lucide-react";
import type { StatusContextInsight } from "@/lib/seo/statusContext";

interface StatusContextBlockProps {
  insight: StatusContextInsight;
}

export default function StatusContextBlock({ insight }: StatusContextBlockProps) {
  const cards = [
    {
      key: "status",
      icon: Activity,
      label: "Current status",
      value: insight.statusHeadline,
      detail: insight.statusDetail,
      accent: "text-emerald-300",
    },
    {
      key: "audience",
      icon: BarChart3,
      label: "Live audience",
      value: insight.audienceHeadline,
      detail: insight.audienceDetail,
      accent: "text-violet-300",
    },
    insight.monitoringHeadline
      ? {
          key: "monitoring",
          icon: Clock3,
          label: "Monitoring window",
          value: insight.monitoringHeadline,
          detail: insight.monitoringDetail ?? "",
          accent: "text-amber-300",
        }
      : null,
    insight.reliabilityHeadline
      ? {
          key: "reliability",
          icon: ShieldCheck,
          label: "Reliability snapshot",
          value: insight.reliabilityHeadline,
          detail: insight.reliabilityDetail ?? "",
          accent: "text-sky-300",
        }
      : null,
  ].filter((card): card is NonNullable<typeof card> => card !== null);

  return (
    <section aria-labelledby="status-context-heading" className="space-y-4">
      <div>
        <h2
          id="status-context-heading"
          className="heading-section text-xl uppercase text-white"
        >
          Live Status Context
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Human-readable summary built from live probes, audience metrics, and
          recorded checks.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.key}
              className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                  <Icon className={`h-4 w-4 ${card.accent}`} aria-hidden />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {card.label}
                </p>
              </div>
              <p className="text-sm font-semibold text-white">{card.value}</p>
              {card.detail ? (
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {card.detail}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
