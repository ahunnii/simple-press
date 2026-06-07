import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { BambooBlogPostPage } from "../../_templates/bamboo/blog/bamboo-blog-post-page";
import { DarkTrendBlogPostPage } from "../../_templates/dark-trend/blog/dark-trend-blog-post-page";
import { DefaultBlogPostPage } from "../../_templates/default/blog/default-blog-post-page";
import { ElegantBlogPostPage } from "../../_templates/elegant/blog/elegant-blog-post-page";
import { HappyBambooBlogPostPage } from "../../_templates/happy-bamboo/blog/happy-bamboo-blog-post-page";
import { ModernBlogPostPage } from "../../_templates/modern/blog/modern-blog-post-page";
import { NoiseBlogPostPage } from "../../_templates/noise/blog/noise-blog-post-page";
import { PollenBlogPostPage } from "../../_templates/pollen/blog/pollen-blog-post-page";
import { SledgeBlogPostPage } from "../../_templates/sledge/blog/sledge-blog-post-page";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PageView({ params }: Props) {
  const { slug } = await params;
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const relatedPosts = await api.content
    .getBlogPages()
    .catch(rethrowTrpcForErrorBoundary);

  const homepage =
    business.templateId === "sledge"
      ? await api.business.getHomepage().catch(rethrowTrpcForErrorBoundary)
      : null;

  const page = await api.content
    .getBlogPostBySlug({
      slug,
    })
    .catch(rethrowTrpcForErrorBoundary);

  if (!page) notFound();

  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const TemplateComponent =
    {
      "happy-bamboo": HappyBambooBlogPostPage,
      noise: NoiseBlogPostPage,
      sledge: SledgeBlogPostPage,
      "dark-trend": DarkTrendBlogPostPage,
      elegant: ElegantBlogPostPage,
      modern: ModernBlogPostPage,
      pollen: PollenBlogPostPage,
      bamboo: BambooBlogPostPage,
    }[business.templateId] ?? DefaultBlogPostPage;

  return (
    <TemplateComponent
      page={page}
      relatedPosts={relatedPosts}
      customFields={customFields}
      business={business}
      {...(business.templateId === "sledge"
        ? { featuredProducts: homepage?.products ?? [] }
        : {})}
    />
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;

  const page = await api.content
    .getBlogPostBySlug({ slug })
    .catch(rethrowTrpcForErrorBoundary);

  if (!page) return { title: "Page Not Found" };

  return {
    title: !!page.metaTitle ? page.metaTitle : page.title,
    description: !!page.metaDescription ? page.metaDescription : page.excerpt,
  } as Metadata;
}

//TODO: Open Graph metadata for the blog post page
