import { notFound } from "next/navigation";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { BambooBlogPage } from "../_templates/bamboo/blog/bamboo-blog-page";
import { DarkTrendBlogPage } from "../_templates/dark-trend/blog/dark-trend-blog-page";
import { DefaultBlogPage } from "../_templates/default/blog/default-blog-page";
import { ElegantBlogPage } from "../_templates/elegant/blog/elegant-blog-page";
import { HappyBambooBlogPage } from "../_templates/happy-bamboo/blog/happy-bamboo-blog-page";
import { ModernBlogPage } from "../_templates/modern/blog/modern-blog-page";
import { NoiseBlogPage } from "../_templates/noise/blog/noise-blog-page";
import { PollenBlogPage } from "../_templates/pollen/blog/pollen-blog-page";

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

  const TemplateComponent =
    {
      "dark-trend": DarkTrendBlogPage,
      modern: ModernBlogPage,
      elegant: ElegantBlogPage,
      pollen: PollenBlogPage,
      bamboo: BambooBlogPage,
      "happy-bamboo": HappyBambooBlogPage,
      noise: NoiseBlogPage,
    }[business.templateId] ?? DefaultBlogPage;

  return (
    <TemplateComponent
      pages={pages}
      customFields={customFields}
      business={business}
    />
  );
}

export const metadata = {
  title: "Blog",
};

//TODO: Metadata for the blog listing page 'should' allow for the business owner to edit them
