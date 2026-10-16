import { notFound } from "next/navigation";

import { resolveBlogPageName } from "~/lib/blog-page-name";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { parsePageParam } from "~/lib/pagination";
import { buildPageMetadata, loadSeoBusiness } from "~/lib/seo";
import { buildItemListSchema } from "~/lib/structured-data";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { JsonLd } from "~/components/json-ld";

import { getTemplate } from "../_templates/registry";

export default async function BlogPage() {
  const { isEnabled } = await getBusinessFlags();
  if (!isEnabled("blog")) notFound();

  const business = await api.business
    .simplifiedGet()
    .catch(rethrowTrpcForErrorBoundary);
  if (!business) notFound();

  const [pages, policies] = await Promise.all([
    api.content.getBlogPages().catch(rethrowTrpcForErrorBoundary),
    api.content.getSimplifiedPages({ type: "policy" }).catch(() => []),
  ]);
  // Newsletter consent links to the store's own privacy policy when published.
  const privacyPolicy = policies.find((p) => p.slug === "privacy-policy");
  const privacyHref = privacyPolicy ? `/${privacyPolicy.slug}` : undefined;

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
      <t.BlogPage
        pages={pages}
        customFields={customFields}
        business={business}
        privacyHref={privacyHref}
      />
    </>
  );
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const business = await loadSeoBusiness("/blog");
  const { page } = await searchParams;
  return buildPageMetadata({
    business,
    path: "/blog",
    pageMetaKey: "blog",
    title: resolveBlogPageName(
      business?.templateId,
      business?.siteContent?.customFields,
    ),
    page: parsePageParam(page),
  });
}
