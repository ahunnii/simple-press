import { notFound, redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

import { getTemplate } from "../../../_templates/registry";

export const metadata = {
  title: "Order Details",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session?.user) {
    const { orderId } = await params;
    redirect(`/auth/sign-in?redirectTo=/account/orders/${orderId}`);
  }

  const { orderId } = await params;

  const [business, order] = await Promise.all([
    api.business.simplifiedGet(),
    api.customer.getMyOrderById({ orderId }),
  ]);

  if (!business) notFound();
  if (!order) notFound();

  const t = getTemplate(business.templateId);

  return <t.OrderDetailPage business={business} order={order} />;
}
