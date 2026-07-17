"use client";

import { UserButton } from "@daveyplate/better-auth-ui";

import { SidebarMenu, SidebarMenuItem } from "~/components/ui/sidebar";

export function NavUser() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <UserButton className="bg-sidebar text-sidebar-accent-foreground hover:bg-sidebar-accent w-full shadow-none" />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
