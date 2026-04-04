import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { HappyBambooBlogPostPage } from "../../_templates/happy-bamboo/happy-bamboo-blog-post-page";

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

  const TemplateComponent =
    {
      "happy-bamboo": HappyBambooBlogPostPage,
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
