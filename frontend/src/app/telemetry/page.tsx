import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ServerStatusPanel from "@/components/ServerStatusPanel";
import DashboardError from "@/components/DashboardError";
import { getServerStatuses } from "@/services/statusService";
import { getGameTelemetry } from "@/services/telemetryService";

export const metadata: Metadata = {
  title: "Server Live Status",
  description:
    "Full server status grid for all monitored gaming, social, and streaming platforms.",
};

export const revalidate = 60;

export default async function TelemetryPage() {
  try {
    const [statuses, gameTelemetry] = await Promise.all([
      getServerStatuses(),
      getGameTelemetry().catch(() => []),
    ]);

    return (
      <PageShell
        title="SERVER LIVE STATUS"
        subtitle="Every tracked platform in one view. Status signals refresh on each sync cycle."
        badge="Servers"
      >
        <ServerStatusPanel statuses={statuses} gameTelemetry={gameTelemetry} />
      </PageShell>
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load server status data from the backend.";

    return <DashboardError message={message} />;
  }
}
