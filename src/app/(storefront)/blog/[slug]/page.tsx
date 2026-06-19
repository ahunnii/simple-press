import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCanonicalUrl } from "~/lib/canonical";
import {
  buildBlogPostingSchema,
  buildBreadcrumbSchema,
} from "~/lib/structured-data";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { JsonLd } from "~/components/json-ld";

import { getTemplate } from "../../_templates/registry";

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

  const t = getTemplate(business.templateId);

  const blogPostingSchema = buildBlogPostingSchema(page, business);
  const breadcrumbSchema = buildBreadcrumbSchema(business, [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: page.title, path: `/blog/${page.slug}` },
  ]);

  return (
    <>
      <JsonLd data={[blogPostingSchema, breadcrumbSchema]} />
      <t.BlogPostPage
        page={page}
        relatedPosts={relatedPosts}
        customFields={customFields}
        business={business}
        {...(business.templateId === "sledge"
          ? { featuredProducts: homepage?.products ?? [] }
          : {})}
      />
    </>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const [page, business] = await Promise.all([
    api.content.getBlogPostBySlug({ slug }).catch(rethrowTrpcForErrorBoundary),
    api.business.simplifiedGet(),
  ]);

  if (!page) return { title: "Page Not Found" };

  const title = !!page.metaTitle ? page.metaTitle : page.title;
  const description = !!page.metaDescription
    ? page.metaDescription
    : (page.excerpt ?? "");

  const ogImage =
    page.ogImage ??
    business?.siteContent?.ogImage ??
    business?.siteContent?.logoUrl ??
    "/placeholder.svg";

  return {
    title,
    description,
    ...(business && {
      alternates: {
        canonical: getCanonicalUrl(business, `/blog/${slug}`),
      },
    }),
    openGraph: {
      title,
      description,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
