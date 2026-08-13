import { notFound } from "next/navigation";

import { JsonLd } from "~/components/json-ld";
import { buildPageMetadata } from "~/lib/seo";
import { buildItemListSchema } from "~/lib/structured-data";
import { api } from "~/trpc/server";

import { getTemplate } from "../_templates/registry";

export default async function ProductsPage() {
  const business = await api.business.getWithProducts();

  if (!business) notFound();

  const t = getTemplate(business.templateId);

  const items = business.products.map((p) => ({
    name: p.name,
    path: `/shop/${p.slug}`,
    image: p.images[0]?.url ?? null,
  }));

  return (
    <>
      <JsonLd data={buildItemListSchema(business, items)} />
      <t.ShopPage business={business} />
    </>
  );
}

export async function generateMetadata() {
  const business = await api.business.simplifiedGet().catch(() => null);
  return buildPageMetadata({
    business,
    path: "/shop",
    pageMetaKey: "shop",
    title: "Shop",
  });
}
