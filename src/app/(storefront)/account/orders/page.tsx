import { notFound, redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

import { getTemplate } from "../../_templates/registry";

export const metadata = {
  title: "My Orders",
  robots: { index: false, follow: false },
};

export default async function OrdersPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/sign-in?redirectTo=/account/orders");
  }

  const [business, orders] = await Promise.all([
    api.business.simplifiedGet(),
    api.customer.getMyOrders(),
  ]);

  if (!business) notFound();

  const t = getTemplate(business.templateId);

  return <t.OrdersPage business={business} orders={orders} />;
}
