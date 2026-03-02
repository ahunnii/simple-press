/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import Link from "next/link";
import {
  IconDashboard,
  IconFolder,
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
import { Building2, Images, Users } from "lucide-react";

import type { Session } from "~/server/better-auth/config";
import { env } from "~/env";
import { api } from "~/trpc/react";
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

const getNavData = (session: Session | null) => {
  const navMain = [
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
      title: "Collections",
      url: "/admin/collections",
      icon: IconFolder,
    },
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
    {
      title: "Reviews",
      url: "/admin/reviews",
      icon: IconStar,
    },
  ];

  const navPlatformAdmin:
    | {
        title: string;
        url: string;
        icon: React.ComponentType<any>;
      }[]
    | [] =
    session?.user.platformRole === "PLATFORM_ADMIN"
      ? [
          {
            title: "Platform Users",
            url: "/admin/platform/users",
            icon: Users,
          },
          {
            title: "Platform Businesses",
            url: "/admin/platform/businesses",
            icon: Building2,
          },
        ]
      : [];

  return {
    navMain,
    navPlatformAdmin,
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
  };
};

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  session?: Session | null;
  businessName?: string | null;
};

export function AppSidebar({
  session,
  businessName,
  ...props
}: AppSidebarProps) {
  const navData = getNavData(session ?? null);

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
                <span className="text-sm text-gray-500">
                  {businessName ?? "Business"}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navData.navMain} />
        {navData.navPlatformAdmin.length > 0 && (
          <NavMain items={navData.navPlatformAdmin} />
        )}
        <NavSecondary items={navData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <WelcomeNotification />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
