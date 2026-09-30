"use client";

import type { RewardsPageTemplateProps } from "../../types";
import { RewardsContent } from "~/app/(storefront)/_components/account/rewards-content";

import { PollenAccountLayout } from "./pollen-account-layout";

export function PollenRewardsPage({ rewards }: RewardsPageTemplateProps) {
  return (
    <PollenAccountLayout heading="Rewards">
      <RewardsContent rewards={rewards} />
    </PollenAccountLayout>
  );
}
