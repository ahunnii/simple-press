import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { DefaultCartPage } from "../_templates/default/default-cart-page";
import ModernCartPage from "../_templates/modern/modern-cart-page";

export default async function CartPage() {
  // Find business
  const business = await api.business.get();

  if (!business) {
    notFound();
  }

  if (business.templateId === "modern") {
    return <ModernCartPage business={business} />;
  }

  return <DefaultCartPage business={business} />;
}
