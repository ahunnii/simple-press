/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { isExternalUrl } from "~/app/admin/_lib/admin-nav";

/** Caps a nav badge count at "99+" so it never blows out the sidebar width. */
function formatBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

export function NavMain({
  items,
  label,
  activeHref,
}: {
  items: {
    title: string;
    url: string;
    icon?: React.ComponentType<any>;
    /** Optional count badge (e.g. pending reviews). Hidden when 0/undefined. */
    badge?: number;
  }[];
  label?: string;
  /** The single active href across the whole sidebar — see `getActiveNavHref`. */
  activeHref?: string | null;
}) {
  const isActive = (url: string) => url === activeHref;
  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const external = isExternalUrl(item.url);
            return (
              <SidebarMenuItem
                key={item.title}
                data-active={isActive(item.url)}
              >
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  className={
                    isActive(item.url)
                      ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary active:bg-primary/20 font-semibold"
                      : ""
                  }
                  aria-current={isActive(item.url) ? "page" : undefined}
                >
                  <Link
                    href={item.url}
                    tabIndex={0}
                    {...(external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
                {!!item.badge && (
                  <SidebarMenuBadge>
                    {formatBadgeCount(item.badge)}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
