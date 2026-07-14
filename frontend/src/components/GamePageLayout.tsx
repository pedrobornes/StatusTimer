import type { ReactNode } from "react";

interface GamePageLayoutProps {
  /** Section tabs — rendered above the grid on mobile, inside the sidebar on lg+. */
  subNav?: ReactNode;
  /** Status, Steam, countdown, and other high-priority widgets. */
  priority: ReactNode;
  /** News, media, FAQ, and other scrollable page content. */
  content: ReactNode;
}

/**
 * Two-column game page shell with mobile-first content order:
 * sub-nav → priority (status / Steam) → content (news / media).
 * On lg+ the main column returns to the left and the sidebar sticks on the right.
 */
export default function GamePageLayout({
  subNav,
  priority,
  content,
}: GamePageLayoutProps) {
  return (
    <div className="space-y-6">
      {subNav ? <div className="lg:hidden">{subNav}</div> : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="order-2 min-w-0 space-y-8 lg:order-1">{content}</div>

        <aside className="order-1 min-w-0 max-w-full space-y-6 lg:order-2 lg:sticky lg:top-24 lg:self-start">
          {subNav ? <div className="hidden lg:block">{subNav}</div> : null}
          {priority}
        </aside>
      </div>
    </div>
  );
}
