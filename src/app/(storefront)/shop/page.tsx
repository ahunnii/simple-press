import { notFound } from "next/navigation";

import { parsePageParam } from "~/lib/pagination";
import { buildPageMetadata, loadSeoBusiness } from "~/lib/seo";
import { buildItemListSchema } from "~/lib/structured-data";
import { api } from "~/trpc/server";
import { JsonLd } from "~/components/json-ld";

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

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const business = await loadSeoBusiness("/shop");
  const { page } = await searchParams;
  return buildPageMetadata({
    business,
    path: "/shop",
    pageMetaKey: "shop",
    title: "Shop",
    page: parsePageParam(page),
  });
}
