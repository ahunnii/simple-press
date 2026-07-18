import { notFound } from "next/navigation";

import { JsonLd } from "~/components/json-ld";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { buildPageMetadata } from "~/lib/seo";
import { buildItemListSchema } from "~/lib/structured-data";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { getTemplate } from "../_templates/registry";

export default async function BlogPage() {
  const { isEnabled } = await getBusinessFlags();
  if (!isEnabled("blog")) notFound();

  const business = await api.business
    .simplifiedGet()
    .catch(rethrowTrpcForErrorBoundary);
  if (!business) notFound();

  const pages = await api.content
    .getBlogPages()
    .catch(rethrowTrpcForErrorBoundary);

  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const t = getTemplate(business.templateId);

  const items = pages.map((p) => ({
    name: p.title,
    path: `/blog/${p.slug}`,
    image: p.ogImage ?? null,
  }));

  return (
    <>
      <JsonLd data={buildItemListSchema(business, items)} />
      <t.BlogPage pages={pages} customFields={customFields} business={business} />
    </>
  );
}

export async function generateMetadata() {
  const business = await api.business.simplifiedGet().catch(() => null);
  return buildPageMetadata({ business, path: "/blog", title: "Blog" });
}

//TODO: Metadata for the blog listing page 'should' allow for the business owner to edit them
