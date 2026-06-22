"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getHubCards } from "~/app/admin/_lib/admin-nav";
import type { NavHub } from "~/app/admin/_lib/admin-nav";

const HUB_LABELS: Record<NavHub, string> = {
  settings: "Settings",
  content: "Content",
};

type Props = {
  hub: NavHub;
};

export function HubSubNav({ hub }: Props) {
  const pathname = usePathname();
  const cards = getHubCards(hub);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav
      aria-label={`${HUB_LABELS[hub]} sub-navigation`}
      className="border-b border-border bg-background"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="no-scrollbar -mb-px flex min-h-[2.75rem] overflow-x-auto">
          {cards.map((card) => {
            const active = isActive(card.href);
            return (
              <Link
                key={card.key}
                href={card.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "inline-flex shrink-0 items-center border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                ].join(" ")}
              >
                {card.title}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
