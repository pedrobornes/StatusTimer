"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Home,
  Newspaper,
  Radar,
  Rocket,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  isActive: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Monitor",
    icon: Home,
    isActive: (pathname) => pathname === "/",
  },
  {
    href: "/telemetry",
    label: "Servers",
    icon: Activity,
    isActive: (pathname) =>
      pathname.startsWith("/telemetry") || pathname.startsWith("/status/"),
  },
  {
    href: "/releases",
    label: "Releases",
    icon: Rocket,
    isActive: (pathname) =>
      pathname.startsWith("/releases") || pathname.startsWith("/release/"),
  },
  {
    href: "/intel",
    label: "News",
    icon: Newspaper,
    isActive: (pathname) => pathname.startsWith("/intel"),
  },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-violet-400/15 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition-colors hover:border-violet-400/40 hover:text-white"
        >
          <Radar className="h-3.5 w-3.5 text-violet-300" />
          Blackwatch
        </Link>

        <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.05] p-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon, isActive }) => {
            const active = isActive(pathname);

            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] transition-colors md:px-4 ${
                  active
                    ? "border border-violet-400/30 bg-violet-500/20 text-white"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
