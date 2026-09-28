"use client";

import type { RewardsPageTemplateProps } from "../../types";
import { RewardsContent } from "~/app/(storefront)/_components/account/rewards-content";

import { ViiAccountLayout } from "./vii-account-layout";

export function ViiRewardsPage({ rewards }: RewardsPageTemplateProps) {
  return (
    <ViiAccountLayout
      heading="Rewards"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Rewards" },
      ]}
    >
      <RewardsContent rewards={rewards} />
    </ViiAccountLayout>
  );
}
