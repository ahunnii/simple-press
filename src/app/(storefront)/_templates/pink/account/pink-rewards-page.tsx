"use client";

import type { RewardsPageTemplateProps } from "../../types";
import { RewardsContent } from "~/app/(storefront)/_components/account/rewards-content";
import { PageTransition } from "~/components/page-animations";

import { PinkAccountLayout } from "./pink-account-layout";

export function PinkRewardsPage({ rewards }: RewardsPageTemplateProps) {
  return (
    <PageTransition>
      <PinkAccountLayout
        title="Rewards"
        description="Earn points on every order and redeem them for rewards."
      >
        <RewardsContent rewards={rewards} />
      </PinkAccountLayout>
    </PageTransition>
  );
}
