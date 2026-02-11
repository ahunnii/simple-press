import { notFound } from "next/navigation";

import type { CardProduct } from "../_templates/modern/modern-product-card";
import { api } from "~/trpc/server";

import { ProductCard } from "../_components/product-card";
import { StorefrontFooter } from "../_components/storefront-footer";
import { StorefrontHeader } from "../_components/storefront-header";
import { DefaultProductsPage } from "../_templates/default/default-products-page";
import { ModernProductsPage } from "../_templates/modern/modern-products-page";

export default async function ProductsPage() {
  const business = await api.business.get({ includeProducts: true });

  if (!business) {
    notFound();
  }

  if (business.templateId === "modern") {
    return <ModernProductsPage business={business} />;
  }

  return <DefaultProductsPage business={business} />;
}
