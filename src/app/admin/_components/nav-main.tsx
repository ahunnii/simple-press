/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";

export function NavMain({
  items,
  label,
}: {
  items: {
    title: string;
    url: string;
    icon?: React.ComponentType<any>;
  }[];
  label?: string;
}) {
  const pathname = usePathname();
  const isActive = (url: string) =>
    pathname === url || pathname.startsWith(url + "/");
  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title} data-active={isActive(item.url)}>
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
                <Link href={item.url} tabIndex={0}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
