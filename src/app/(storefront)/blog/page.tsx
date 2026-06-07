import { notFound } from "next/navigation";

import { getCanonicalUrl } from "~/lib/canonical";
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
import { SledgeBlogPage } from "../_templates/sledge/blog/sledge-blog-page";

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
      sledge: SledgeBlogPage,
    }[business.templateId] ?? DefaultBlogPage;

  return (
    <TemplateComponent
      pages={pages}
      customFields={customFields}
      business={business}
    />
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
