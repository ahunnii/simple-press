import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { getTemplate } from "../_templates/registry";

export default async function CartPage() {
  const business = await api.business.simplifiedGetWithProducts();
  if (!business) notFound();

  const t = getTemplate(business.templateId);

  return <t.CartPage business={business} />;
}

export const metadata = {
  title: "Cart",
};
