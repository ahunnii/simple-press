import { notFound } from "next/navigation";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { BambooBlogPage } from "../_templates/bamboo/blog/bamboo-blog-page";
import { DefaultBlogPage } from "../_templates/default/default-blog-page";
import { DarkTrendBlogPage } from "../_templates/dark-trend/blog/dark-trend-blog-page";
import { ElegantBlogPage } from "../_templates/elegant/elegant-blog-page";
import { HappyBambooBlogPage } from "../_templates/happy-bamboo/blog/happy-bamboo-blog-page";
import { ModernBlogPage } from "../_templates/modern/modern-blog-page";
import { NoiseBlogPage } from "../_templates/noise/blog/noise-blog-page";
import { PollenBlogPage } from "../_templates/pollen/pollen-blog-page";

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

  if (business.templateId === "noise") {
    return <NoiseBlogPage pages={pages} customFields={customFields} />;
  }

  if (business.templateId === "dark-trend") {
    return <DarkTrendBlogPage pages={pages} customFields={customFields} />;
  }

  if (business.templateId === "happy-bamboo") {
    return <HappyBambooBlogPage pages={pages} customFields={customFields} />;
  }

  if (business.templateId === "default") {
    return <DefaultBlogPage pages={pages} customFields={customFields} />;
  }

  if (business.templateId === "elegant") {
    return <ElegantBlogPage pages={pages} customFields={customFields} />;
  }

  if (business.templateId === "modern") {
    return <ModernBlogPage pages={pages} customFields={customFields} />;
  }

  if (business.templateId === "pollen") {
    return (
      <PollenBlogPage
        pages={pages}
        customFields={customFields}
        business={business}
      />
    );
  }

  if (business.templateId === "bamboo") {
    return <BambooBlogPage pages={pages} customFields={customFields} />;
  }

  return <HappyBambooBlogPage pages={pages} />;
}

export const metadata = {
  title: "Blog",
};
