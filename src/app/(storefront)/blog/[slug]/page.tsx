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

  const page = await api.content
    .getBlogPostBySlug({
      slug,
    })
    .catch(rethrowTrpcForErrorBoundary);

  if (!page) notFound();

  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  if (business.templateId === "pollen") {
    return (
      <PollenBlogPostPage
        page={page}
        relatedPosts={relatedPosts}
        business={business}
      />
    );
  }

  if (business.templateId === "bamboo") {
    return (
      <BambooBlogPostPage
        page={page}
        relatedPosts={relatedPosts}
        customFields={customFields}
      />
    );
  }

  const TemplateComponent =
    {
      "happy-bamboo": HappyBambooBlogPostPage,
      noise: NoiseBlogPostPage,
      "dark-trend": DarkTrendBlogPostPage,
      default: DefaultBlogPostPage,
      elegant: ElegantBlogPostPage,
      modern: ModernBlogPostPage,
    }[business.templateId] ?? HappyBambooBlogPostPage;

  return <TemplateComponent page={page} relatedPosts={relatedPosts} />;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;

  const page = await api.content
    .getBlogPostBySlug({
      slug,
    })
    .catch(rethrowTrpcForErrorBoundary);

  if (!page) return { title: "Page Not Found" };

  return {
    title: !!page.metaTitle ? page.metaTitle : page.title,
    description: !!page.metaDescription ? page.metaDescription : page.excerpt,
  } as Metadata;
}
