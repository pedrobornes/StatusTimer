import { Users } from "lucide-react";
import SocialStatusCard from "@/components/dashboard/SocialStatusCard";
import type { ServerStatus } from "@/types/api";

interface SocialPlatformsSectionProps {
  statuses: ServerStatus[];
}

export default function SocialPlatformsSection({
  statuses,
}: SocialPlatformsSectionProps) {
  const socialStatuses = statuses.filter((status) => status.category === "SOCIAL");

  return (
    <section className="glass-panel rounded-3xl p-6 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-3">
          <Users className="h-5 w-5 text-fuchsia-300" />
        </div>
        <div>
          <h2 className="heading-section text-2xl text-white">Social</h2>
          <p className="mt-1 text-sm text-slate-400">
            Connectivity checks for messaging, video, and streaming platforms via TCP probes.
          </p>
        </div>
      </div>

      {socialStatuses.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-fuchsia-400/20 px-4 py-6 text-sm text-slate-400">
          Checking social platforms now…
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {socialStatuses.map((status) => (
            <SocialStatusCard key={status.id} status={status} />
          ))}
        </div>
      )}
    </section>
  );
}
