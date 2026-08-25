"use client";

import { useMemo } from "react";
import { IconCompass, IconHelp, IconSettings } from "@tabler/icons-react";

import type { AdminRole, NavSection } from "~/app/admin/_lib/admin-nav";
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
import { SimplePressWordmark } from "~/components/shared/simplepress-wordmark";
import { NavMain } from "~/app/admin/_components/nav-main";
import { NavSecondary } from "~/app/admin/_components/nav-secondary";
import { NavUser } from "~/app/admin/_components/nav-user";
import {
  isNavItemAllowedForRole,
  NAV_ITEMS,
  NAV_SECTION_LABELS,
} from "~/app/admin/_lib/admin-nav";

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
    staffAccessible: false,
  },
  {
    title: "Setup Guide",
    url: "/admin/welcome",
    icon: IconCompass,
    staffAccessible: false,
  },
  {
    title: "Get Help",
    url: env.NEXT_PUBLIC_HELP_URL,
    icon: IconHelp,
    staffAccessible: true,
  },
];

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  session?: Session | null;
  businessName?: string | null;
  featureData?: { flags: Record<string, boolean> };
  /** Business membership role; null for PLATFORM_ADMIN (sees everything). */
  membershipRole?: AdminRole | null;
  /** Drives the sidebar's "Finish setup" nudge — see WelcomeNotification. */
  welcomeSetupStatus?: { stripeConnected: boolean; hasProducts: boolean };
  /**
   * Count of unapproved `ProductReview` rows for the business, fetched once
   * in the admin layout. Rendered as a badge on the Reviews nav item only —
   * see the `item.key === "reviews"` check below. Undefined/0 renders no
   * badge.
   */
  pendingReviewCount?: number;
};

export function AppSidebar({
  session,
  businessName,
  featureData,
  membershipRole,
  welcomeSetupStatus,
  pendingReviewCount,
  ...props
}: AppSidebarProps) {
  const { isEnabled, isDisabledByDependency } = useFeatureFlags({
    flags: featureData?.flags ?? {},
  });

  // PLATFORM_ADMIN (membershipRole is null/undefined) bypasses role filtering.
  const roleForFiltering: AdminRole | null =
    session?.user.platformRole === "PLATFORM_ADMIN"
      ? null
      : (membershipRole ?? null);

  const groupedNav = useMemo(() => {
    return NAV_SECTION_ORDER.map((section) => {
      const items = NAV_ITEMS.filter((item) => {
        if (item.section !== section) return false;
        if (!isNavItemAllowedForRole(item, roleForFiltering)) return false;
        if (!item.featureKey) return true;
        return (
          isEnabled(item.featureKey) && !isDisabledByDependency(item.featureKey)
        );
      }).map((item) => ({
        title: item.title,
        url: item.href,
        icon: item.icon,
        // Only the Reviews item carries a badge today. Gated on the item
        // itself already having survived the feature/role filter above, so
        // the count never renders for a nav entry the sidebar wouldn't
        // otherwise show.
        badge: item.key === "reviews" ? pendingReviewCount : undefined,
      }));

      return { section, label: NAV_SECTION_LABELS[section], items };
    }).filter((group) => group.items.length > 0);
  }, [isEnabled, isDisabledByDependency, roleForFiltering, pendingReviewCount]);

  const secondaryItems = useMemo(() => {
    if (roleForFiltering !== "STAFF") return navSecondary;
    return navSecondary.filter((item) => item.staffAccessible);
  }, [roleForFiltering]);

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
              <SimplePressWordmark
                href="/"
                subline={businessName ?? "Business"}
                sublineClassName="text-muted-foreground"
              />
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
        <NavSecondary items={secondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <WelcomeNotification
          stripeConnected={welcomeSetupStatus?.stripeConnected ?? false}
          hasProducts={welcomeSetupStatus?.hasProducts ?? false}
        />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
