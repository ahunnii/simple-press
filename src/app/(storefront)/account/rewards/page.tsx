import { notFound, redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

import { getTemplate } from "../../_templates/registry";

export const metadata = {
  title: "Rewards",
  robots: { index: false, follow: false },
};

export default async function RewardsPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/sign-in?redirectTo=/account/rewards");
  }

  // Not gated on the `loyalty` flag here — a customer who already has a
  // balance must always be able to see it. `loyalty.getMine` is an ungated
  // read (see the router's docblock); its own `flags.loyalty` tells the
  // component whether to offer new ways to earn/redeem.
  const [business, rewards] = await Promise.all([
    api.business.simplifiedGet(),
    api.loyalty.getMine(),
  ]);

  if (!business) notFound();

  const t = getTemplate(business.templateId);

  return <t.RewardsPage business={business} rewards={rewards} />;
}
