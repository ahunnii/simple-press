"use client";

import type { RewardsPageTemplateProps } from "../../types";
import { RewardsContent } from "~/app/(storefront)/_components/account/rewards-content";

import { DefaultAccountLayout } from "./default-account-layout";

export function DefaultRewardsFallback({ rewards }: RewardsPageTemplateProps) {
  return (
    <DefaultAccountLayout heading="Rewards">
      <RewardsContent rewards={rewards} />
    </DefaultAccountLayout>
  );
}
