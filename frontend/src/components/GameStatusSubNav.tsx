"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Clapperboard, Newspaper } from "lucide-react";
import { APP_ROUTES } from "@/config/routes";

export type GameStatusTab = "status" | "news" | "media";

interface GameStatusSubNavProps {
  slug: string;
  hasNews?: boolean;
  hasMedia?: boolean;
}

export default function GameStatusSubNav({
  slug,
  hasNews = true,
  hasMedia = true,
}: GameStatusSubNavProps) {
  const pathname = usePathname();

  const tabs: Array<{
    key: GameStatusTab;
    href: string;
    label: string;
    icon: typeof Activity;
  }> = [
    {
      key: "status",
      href: APP_ROUTES.status(slug),
      label: "Status",
      icon: Activity,
    },
    ...(hasNews
      ? [
          {
            key: "news" as const,
            href: APP_ROUTES.gameNews(slug),
            label: "News",
            icon: Newspaper,
          },
        ]
      : []),
    ...(hasMedia
      ? [
          {
            key: "media" as const,
            href: APP_ROUTES.gameMedia(slug),
            label: "Media",
            icon: Clapperboard,
          },
        ]
      : []),
  ];

  if (tabs.length <= 1) {
    return null;
  }

  const isActive = (href: string, key: GameStatusTab) => {
    if (key === "status") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      aria-label="Game sections"
      className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5"
    >
      {tabs.map(({ key, href, label, icon: Icon }) => {
        const active = isActive(href, key);

        return (
          <Link
            key={key}
            href={href}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium uppercase tracking-[0.14em] transition ${
              active
                ? "border border-violet-400/30 bg-violet-500/20 text-white"
                : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
