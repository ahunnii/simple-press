"use client";

import * as React from "react";
import Link from "next/link";
import { type Icon } from "@tabler/icons-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { isExternalUrl } from "~/app/admin/_lib/admin-nav";

export function NavSecondary({
  items,
  activeHref,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon: Icon;
  }[];
  /** The single active href across the whole sidebar — see `getActiveNavHref`. */
  activeHref?: string | null;
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const isActive = (url: string) => url === activeHref;

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const external = isExternalUrl(item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <Link
                    href={item.url}
                    {...(external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className={
                      isActive(item.url)
                        ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary active:bg-primary/20 font-semibold"
                        : ""
                    }
                    aria-current={isActive(item.url) ? "page" : undefined}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
