"use client";

import type { RewardsPageTemplateProps } from "../../types";
import { RewardsContent } from "~/app/(storefront)/_components/account/rewards-content";
import { PageTransition } from "~/components/page-animations";

import { HappyBambooAccountLayout } from "./happy-bamboo-account-layout";

/**
 * happy-bamboo's `RewardsPage` (registry: `RewardsPage`). `RewardsContent` is
 * the shared, design-token-only rewards body (balance, ways to earn, redeem,
 * codes, birthday bonus, recent activity, and the "this store hasn't set up
 * a rewards program yet" empty state) — same data logic Default falls back
 * to via `DefaultRewardsFallback`. This just swaps the chrome for
 * `HappyBambooAccountLayout` so it matches the other account pages (see
 * `happy-bamboo-orders-page.tsx`).
 */
export function HappyBambooRewardsPage({ rewards }: RewardsPageTemplateProps) {
  return (
    <PageTransition>
      <HappyBambooAccountLayout
        heading="Rewards"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Account", href: "/account/settings" },
          { label: "Rewards" },
        ]}
      >
        <RewardsContent rewards={rewards} />
      </HappyBambooAccountLayout>
    </PageTransition>
  );
}
