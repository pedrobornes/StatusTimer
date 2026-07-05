import type { ReactNode } from "react";

interface SidebarPanelHeaderProps {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  action?: ReactNode;
  iconClassName?: string;
}

export default function SidebarPanelHeader({
  icon,
  eyebrow,
  title,
  action,
  iconClassName = "border-violet-400/25 bg-violet-500/10",
}: SidebarPanelHeaderProps) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`shrink-0 rounded-2xl border p-2.5 ${iconClassName}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
            {eyebrow}
          </p>
          <h2 className="heading-section truncate text-lg uppercase leading-tight text-white">
            {title}
          </h2>
        </div>
      </div>

      {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
    </div>
  );
}

interface SidebarEmptyStateProps {
  message: string;
}

export function SidebarEmptyState({ message }: SidebarEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-5 text-center">
      <p className="text-sm font-medium leading-6 text-emerald-100/90">{message}</p>
    </div>
  );
}
