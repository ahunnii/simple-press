import { notFound } from "next/navigation";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { HappyBambooBlogPage } from "../_templates/happy-bamboo/blog/happy-bamboo-blog-page";

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

  if (business.templateId === "happy-bamboo") {
    return <HappyBambooBlogPage pages={pages} customFields={customFields} />;
  }

  return <HappyBambooBlogPage pages={pages} />;
}

export const metadata = {
  title: "Blog",
};
