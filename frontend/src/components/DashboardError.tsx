import { Sparkles } from "lucide-react";

interface DashboardErrorProps {
  message: string;
}

export default function DashboardError({ message }: DashboardErrorProps) {
  return (
    <div className="mystery-grid min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs uppercase tracking-[0.35em] text-violet-200/80">
          <Sparkles className="h-3.5 w-3.5" />
          StatusTimer
        </div>

        <div className="glass-panel rounded-3xl border border-rose-400/20 p-8 text-center">
          <h1 className="font-[family-name:var(--font-cinzel)] text-2xl text-white">
            Dashboard connection failed
          </h1>
          <p className="mt-4 text-sm text-violet-200/60">{message}</p>
          <p className="mt-2 text-sm text-violet-200/45">
            Ensure the backend is running on port 8080.
          </p>
        </div>
      </div>
    </div>
  );
}
