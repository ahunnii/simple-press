"use client";

import type { RewardsPageTemplateProps } from "../../types";
import { RewardsContent } from "~/app/(storefront)/_components/account/rewards-content";

import { DarkTrendAccountLayout } from "./dark-trend-account-layout";

export function DarkTrendRewardsPage({ rewards }: RewardsPageTemplateProps) {
  return (
    <DarkTrendAccountLayout heading="Rewards">
      <RewardsContent rewards={rewards} />
    </DarkTrendAccountLayout>
  );
}
