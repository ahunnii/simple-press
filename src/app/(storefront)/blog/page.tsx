import { notFound } from "next/navigation";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { HappyBambooBlogPage } from "../_templates/happy-bamboo/happy-bamboo-blog-page";

export default async function BlogPage() {
  const business = await api.business
    .simplifiedGet()
    .catch(rethrowTrpcForErrorBoundary);
  if (!business) notFound();

  const pages = await api.content
    .getBlogPages()
    .catch(rethrowTrpcForErrorBoundary);

  const TemplateComponent =
    {
      "happy-bamboo": HappyBambooBlogPage,
    }[business.templateId] ?? HappyBambooBlogPage;

  return <TemplateComponent pages={pages} />;
}

export const metadata = {
  title: "Blog",
};
