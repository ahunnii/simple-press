"use client";

import * as React from "react";
import Link from "next/link";
import {
  IconDashboard,
  IconHelp,
  IconImageInPicture,
  IconLanguage,
  IconMail,
  IconPackage,
  IconSettings,
  IconShoppingCart,
  IconStar,
  IconTerminal,
} from "@tabler/icons-react";
import { Images } from "lucide-react";

import { env } from "~/env";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { NavMain } from "~/app/admin/_components/nav-main";
import { NavSecondary } from "~/app/admin/_components/nav-secondary";
import { NavUser } from "~/app/admin/_components/nav-user";

import WelcomeNotification from "./welcome-notification";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Orders",
      url: "/admin/orders",
      icon: IconShoppingCart,
    },

    {
      title: "Products",
      url: "/admin/products",
      icon: IconPackage,
    },

    // {
    //   title: "Discounts",
    //   url: "/admin/discounts",
    //   icon: IconDiscount,
    // },
    // {
    //   title: "Collections",
    //   url: "/admin/collections",
    //   icon: IconFolder,
    // },
    {
      title: "Site content",
      url: "/admin/content",
      icon: IconLanguage,
    },
    {
      title: "Galleries",
      url: "/admin/galleries",
      icon: IconImageInPicture,
    },
    {
      title: "Testimonials",
      url: "/admin/testimonials",
      icon: IconStar,
    },
  ],
  navClouds: [],
  navSecondary: [
    {
      title: "Settings",
      url: "/admin/settings",
      icon: IconSettings,
    },
    {
      title: "Emails",
      url: "/admin/emails",
      icon: IconMail,
    },
    {
      title: "Get Help",
      url: env.NEXT_PUBLIC_HELP_URL,
      icon: IconHelp,
    },
  ],
  documents: [],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-20 w-full data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/" className="flex flex-col items-start">
                <span className="flex flex-row items-center gap-1 font-mono text-2xl font-bold">
                  <IconTerminal className="size-8" />
                  simple_press
                </span>
                {/* <span className="text-sm text-gray-500">Artisanal Futures</span> */}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <WelcomeNotification />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
