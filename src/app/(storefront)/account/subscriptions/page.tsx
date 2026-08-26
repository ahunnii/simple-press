import { notFound, redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

import { getTemplate } from "../../_templates/registry";

export const metadata = {
  title: "My Subscriptions",
  robots: { index: false, follow: false },
};

/** `/account/subscriptions` — same dispatch pattern as `account/orders/page.tsx`. */
export default async function SubscriptionsPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/sign-in?redirectTo=/account/subscriptions");
  }

  const [business, subscriptions] = await Promise.all([
    api.business.simplifiedGet(),
    api.subscription.getMine(),
  ]);

  if (!business) notFound();

  const t = getTemplate(business.templateId);

  return (
    <t.SubscriptionsPage business={business} subscriptions={subscriptions} />
  );
}
