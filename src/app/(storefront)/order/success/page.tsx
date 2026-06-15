import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { getTemplate } from "../../_templates/registry";

export default async function OrderSuccessPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const t = getTemplate(business.templateId);

  return <t.OrderSuccessPage business={business} />;
}

export const metadata = {
  title: "Order Details",
};
