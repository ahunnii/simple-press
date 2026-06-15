import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { getTemplate } from "../_templates/registry";

export default async function CheckoutPage() {
  const business = await api.business.simplifiedGet();
  const environment = process.env.NODE_ENV;
  if (!business) notFound();

  const t = getTemplate(business.templateId);

  if (!business.isStripeConnected && environment !== "development")
    return <t.CheckoutUnavailable />;

  return <t.CheckoutPage business={business} />;
}

export const metadata = {
  title: "Checkout",
};
