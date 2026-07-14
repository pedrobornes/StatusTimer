"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleHelp,
  Gamepad2,
  Home,
  Rocket,
} from "lucide-react";
import StatusTimerSonarLogo from "@/components/ui/StatusTimerSonarLogo";
import { APP_ROUTES } from "@/config/routes";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  isActive: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: APP_ROUTES.home,
    label: "Monitor",
    icon: Home,
    isActive: (pathname) => pathname === APP_ROUTES.home,
  },
  {
    href: APP_ROUTES.games,
    label: "Games",
    icon: Gamepad2,
    isActive: (pathname) =>
      pathname.startsWith(APP_ROUTES.games) ||
      pathname.startsWith("/status/"),
  },
  {
    href: APP_ROUTES.releases,
    label: "Game Releases",
    icon: Rocket,
    isActive: (pathname) =>
      pathname.startsWith(APP_ROUTES.releases) ||
      pathname.startsWith("/release/"),
  },
  {
    href: APP_ROUTES.howItWorks,
    label: "How it works",
    icon: CircleHelp,
    isActive: (pathname) => pathname.startsWith(APP_ROUTES.howItWorks),
  },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-violet-400/15 bg-mystic-950/95">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 md:px-8">
        <Link
          href={APP_ROUTES.home}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200 transition-colors hover:border-violet-400/40 hover:text-white sm:gap-3 sm:px-3 sm:tracking-[0.3em]"
        >
          <StatusTimerSonarLogo className="h-8 w-8 shrink-0" />
          <span className="hidden sm:inline">StatusTimer</span>
        </Link>

        <div className="inline-flex w-full justify-center sm:w-auto">
          <div className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.05] p-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon, isActive }) => {
              const active = isActive(pathname);

              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors sm:gap-2 sm:px-3 sm:text-xs ${
                    active
                      ? "border border-violet-400/30 bg-violet-500/20 text-white"
                      : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
