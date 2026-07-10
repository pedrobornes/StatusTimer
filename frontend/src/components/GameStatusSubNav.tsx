"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Clapperboard, Newspaper } from "lucide-react";
import { APP_ROUTES } from "@/config/routes";

export type GameStatusTab = "status" | "news" | "media";
export type GamePageSubNavVariant = "status" | "release";
export type GamePageSubNavLayout = "centered" | "sidebar";

interface GameStatusSubNavProps {
  slug: string;
  variant?: GamePageSubNavVariant;
  layout?: GamePageSubNavLayout;
  hasNews?: boolean;
  hasMedia?: boolean;
}

interface SubNavTab {
  key: GameStatusTab;
  href: string;
  label: string;
  icon: typeof Activity;
}

export default function GameStatusSubNav({
  slug,
  variant = "status",
  layout = "centered",
  hasNews = true,
  hasMedia = true,
}: GameStatusSubNavProps) {
  const pathname = usePathname();

  const newsHref =
    variant === "release" ? APP_ROUTES.releaseNews(slug) : APP_ROUTES.gameNews(slug);
  const mediaHref = APP_ROUTES.gameMedia(slug);

  const tabs: SubNavTab[] =
    variant === "release"
      ? [
          ...(hasNews
            ? [
                {
                  key: "news" as const,
                  href: newsHref,
                  label: "News",
                  icon: Newspaper,
                },
              ]
            : []),
          ...(hasMedia
            ? [
                {
                  key: "media" as const,
                  href: mediaHref,
                  label: "Media",
                  icon: Clapperboard,
                },
              ]
            : []),
        ]
      : [
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
                  href: newsHref,
                  label: "News",
                  icon: Newspaper,
                },
              ]
            : []),
          ...(hasMedia
            ? [
                {
                  key: "media" as const,
                  href: mediaHref,
                  label: "Media",
                  icon: Clapperboard,
                },
              ]
            : []),
        ];

  if (tabs.length === 0) {
    return null;
  }

  const isActive = (href: string, key: GameStatusTab) => {
    if (key === "status") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navClassName =
    layout === "sidebar"
      ? "flex w-full flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5"
      : "mx-auto mb-8 flex w-fit flex-wrap justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5";

  const linkClassName =
    layout === "sidebar"
      ? "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium uppercase tracking-[0.14em] transition min-w-[calc(50%-0.25rem)]"
      : "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium uppercase tracking-[0.14em] transition";

  return (
    <nav aria-label="Game sections" className={navClassName}>
      {tabs.map(({ key, href, label, icon: Icon }) => {
        const active = isActive(href, key);

        return (
          <Link
            key={key}
            href={href}
            className={`${linkClassName} ${
              active
                ? "border border-violet-400/30 bg-violet-500/20 text-white"
                : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
