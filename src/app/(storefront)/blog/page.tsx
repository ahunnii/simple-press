import { notFound } from "next/navigation";

import { getCanonicalUrl } from "~/lib/canonical";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { getTemplate } from "../_templates/registry";

export default async function BlogPage() {
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

  return (
    <t.BlogPage pages={pages} customFields={customFields} business={business} />
  );
}

export async function generateMetadata() {
  const business = await api.business.simplifiedGet().catch(() => null);
  return {
    title: "Blog",
    ...(business && {
      alternates: {
        canonical: getCanonicalUrl(business, "/blog"),
      },
    }),
  };
}

//TODO: Metadata for the blog listing page 'should' allow for the business owner to edit them
