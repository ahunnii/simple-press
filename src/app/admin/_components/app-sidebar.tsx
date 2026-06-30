"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  IconCompass,
  IconHelp,
  IconMail,
  IconSettings,
  IconTerminal,
} from "@tabler/icons-react";

import type { NavSection } from "~/app/admin/_lib/admin-nav";
import type { Session } from "~/server/better-auth/config";
import { env } from "~/env";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
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
import { NAV_ITEMS, NAV_SECTION_LABELS } from "~/app/admin/_lib/admin-nav";

import WelcomeNotification from "./welcome-notification";

const NAV_SECTION_ORDER: NavSection[] = [
  "sell",
  "catalog",
  "marketing",
  "content",
  "insights",
];

const navSecondary = [
  {
    title: "Settings",
    url: "/admin/settings",
    icon: IconSettings,
  },
  {
    title: "Email Templates",
    url: "/admin/emails",
    icon: IconMail,
  },
  {
    title: "Setup Guide",
    url: "/admin/welcome",
    icon: IconCompass,
  },
  {
    title: "Get Help",
    url: env.NEXT_PUBLIC_HELP_URL,
    icon: IconHelp,
  },
];

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  session?: Session | null;
  businessName?: string | null;
  featureData?: { flags: Record<string, boolean> };
};

export function AppSidebar({
  session,
  businessName,
  featureData,
  ...props
}: AppSidebarProps) {
  const { isEnabled, isDisabledByDependency } = useFeatureFlags({
    flags: featureData?.flags ?? {},
  });

  const groupedNav = useMemo(() => {
    return NAV_SECTION_ORDER.map((section) => {
      const items = NAV_ITEMS.filter((item) => {
        if (item.section !== section) return false;
        if (!item.featureKey) return true;
        return (
          isEnabled(item.featureKey) && !isDisabledByDependency(item.featureKey)
        );
      }).map((item) => ({
        title: item.title,
        url: item.href,
        icon: item.icon,
      }));

      return { section, label: NAV_SECTION_LABELS[section], items };
    }).filter((group) => group.items.length > 0);
  }, [isEnabled, isDisabledByDependency]);

  const platformItems = useMemo(() => {
    if (session?.user.platformRole !== "PLATFORM_ADMIN") return [];
    return NAV_ITEMS.filter((item) => item.section === "platform").map(
      (item) => ({
        title: item.title,
        url: item.href,
        icon: item.icon,
      }),
    );
  }, [session?.user.platformRole]);

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
                <span className="text-muted-foreground text-sm">
                  {businessName ?? "Business"}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groupedNav.map((group) => (
          <NavMain
            key={group.section}
            items={group.items}
            label={group.label}
          />
        ))}
        {platformItems.length > 0 && (
          <NavMain items={platformItems} label={NAV_SECTION_LABELS.platform} />
        )}
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <WelcomeNotification />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
