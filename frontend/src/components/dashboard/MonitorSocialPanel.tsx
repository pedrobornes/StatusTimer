import { Users } from "lucide-react";
import SidebarPanelHeader, {
  SidebarEmptyState,
} from "@/components/dashboard/SidebarPanelHeader";
import SocialStatusCard from "@/components/dashboard/SocialStatusCard";
import type { ServerStatus } from "@/types/api";

interface MonitorSocialPanelProps {
  statuses: ServerStatus[];
}

export default function MonitorSocialPanel({
  statuses,
}: MonitorSocialPanelProps) {
  const socialStatuses = statuses.filter(
    (status) => status.category === "SOCIAL",
  );

  return (
    <section className="glass-panel glow-ring rounded-3xl p-5 md:p-6">
      <SidebarPanelHeader
        icon={<Users className="h-4 w-4 text-fuchsia-300" />}
        iconClassName="border-fuchsia-400/25 bg-fuchsia-500/10"
        eyebrow="Connectivity"
        title="Social Platforms"
      />

      {socialStatuses.length === 0 ? (
        <SidebarEmptyState message="Checking social platforms now…" />
      ) : (
        <div className="space-y-2.5">
          {socialStatuses.map((status) => (
            <SocialStatusCard key={status.id} status={status} compact />
          ))}
        </div>
      )}
    </section>
  );
}
