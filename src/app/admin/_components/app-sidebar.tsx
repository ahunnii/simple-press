"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  IconArticle,
  IconBuildingCommunity,
  IconCamera,
  IconChartBar,
  IconConfetti,
  IconDashboard,
  IconDatabase,
  IconDiscount,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconLanguage,
  IconListDetails,
  IconPackage,
  IconReport,
  IconSearch,
  IconSettings,
  IconShoppingCart,
  IconTerminal,
  IconUsers,
} from "@tabler/icons-react";

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
import { NavDocuments } from "~/app/admin/_components/nav-documents";
import { NavMain } from "~/app/admin/_components/nav-main";
import { NavSecondary } from "~/app/admin/_components/nav-secondary";
import { NavUser } from "~/app/admin/_components/nav-user";

import WelcomeNotification from "./welcome-notification";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
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

    {
      title: "Discounts",
      url: "/admin/discounts",
      icon: IconDiscount,
    },
    {
      title: "Collections",
      url: "/admin/collections",
      icon: IconFolder,
    },
    // {
    //   title: "Members",
    //   url: "/admin/members",
    //   icon: IconUsers,
    // },
    // {
    //   title: "Pages",
    //   url: "/admin/pages",
    //   icon: IconFileDescription,
    // },
    {
      title: "Site content",
      url: "/admin/site-content",
      icon: IconLanguage,
    },
  ],
  navClouds: [
    // {
    //   title: "Capture",
    //   icon: IconCamera,
    //   isActive: true,
    //   url: "#",
    //   items: [
    //     {
    //       title: "Active Proposals",
    //       url: "#",
    //     },
    //     {
    //       title: "Archived",
    //       url: "#",
    //     },
    //   ],
    // },
    // {
    //   title: "Proposal",
    //   icon: IconFileDescription,
    //   url: "#",
    //   items: [
    //     {
    //       title: "Active Proposals",
    //       url: "#",
    //     },
    //     {
    //       title: "Archived",
    //       url: "#",
    //     },
    //   ],
    // },
    // {
    //   title: "Prompts",
    //   icon: IconFileAi,
    //   url: "#",
    //   items: [
    //     {
    //       title: "Active Proposals",
    //       url: "#",
    //     },
    //     {
    //       title: "Archived",
    //       url: "#",
    //     },
    //   ],
    // },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/admin/settings",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: env.NEXT_PUBLIC_HELP_URL,
      icon: IconHelp,
    },
    // {
    //   title: "Search",
    //   url: "#",
    //   icon: IconSearch,
    // },
  ],
  documents: [
    // {
    //   name: "Data Library",
    //   url: "#",
    //   icon: IconDatabase,
    // },
    // {
    //   name: "Reports",
    //   url: "#",
    //   icon: IconReport,
    // },
    // {
    //   name: "Word Assistant",
    //   url: "#",
    //   icon: IconFileWord,
    // },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-20 w-full data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/" className="flex flex-col items-start">
                <span className="flex flex-row items-center gap-1 font-mono text-2xl font-bold">
                  <IconTerminal className="size-8" />
                  simple_press
                </span>
                <span className="text-sm text-gray-500">Artisanal Futures</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavDocuments items={data.documents} /> */}

        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <WelcomeNotification />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
