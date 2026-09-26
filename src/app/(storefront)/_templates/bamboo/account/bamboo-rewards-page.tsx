"use client";

import type { RewardsPageTemplateProps } from "../../types";
import { RewardsContent } from "~/app/(storefront)/_components/account/rewards-content";
import { PageTransition } from "~/components/page-animations";

import { BambooAccountLayout } from "./bamboo-account-layout";

export function BambooRewardsPage({ rewards }: RewardsPageTemplateProps) {
  return (
    <PageTransition>
      <BambooAccountLayout
        heading="Rewards"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Account", href: "/account/settings" },
          { label: "Rewards" },
        ]}
      >
        <RewardsContent rewards={rewards} />
      </BambooAccountLayout>
    </PageTransition>
  );
}
