"use client";

import { SidebarMenu, SidebarMenuItem } from "~/components/ui/sidebar";
import { UserButton } from "~/components/auth/user/user-button";

export function NavUser() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <UserButton className="bg-sidebar text-sidebar-accent-foreground hover:bg-sidebar-accent w-full shadow-none" />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
