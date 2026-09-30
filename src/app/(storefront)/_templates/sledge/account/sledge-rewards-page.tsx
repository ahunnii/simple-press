"use client";

import type { RewardsPageTemplateProps } from "../../types";
import { RewardsContent } from "~/app/(storefront)/_components/account/rewards-content";
import { PageTransition } from "~/components/page-animations";

import { SledgeAccountLayout } from "./sledge-account-layout";

export function SledgeRewardsPage({ rewards }: RewardsPageTemplateProps) {
  return (
    <PageTransition className="bg-white">
      <SledgeAccountLayout heading="Rewards">
        <RewardsContent rewards={rewards} />
      </SledgeAccountLayout>
    </PageTransition>
  );
}
