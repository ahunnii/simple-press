import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCanonicalUrl } from "~/lib/canonical";
import {
  buildBreadcrumbSchema,
  buildWebPageSchema,
} from "~/lib/structured-data";
import { api } from "~/trpc/server";
import { JsonLd } from "~/components/json-ld";

import { getTemplate } from "../_templates/registry";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PageView({ params }: Props) {
  const { slug } = await params;
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const page = await api.content.getPageBySlug({
    slug,
  });

  // Blog posts have their own dedicated route (/blog/[slug]), which is
  // feature-gated behind the `blog` flag. getPageBySlug matches any page
  // type by slug, so without this guard a blog post would also render here
  // — bypassing the blog flag and creating a duplicate-canonical URL for
  // the same content at two paths.
  if (!page || page.type === "blog") notFound();

  const t = getTemplate(business.templateId);

  const pageTitle = page.metaTitle ?? page.title;
  const pageDescription = page.metaDescription ?? page.excerpt ?? undefined;

  const webPageSchema = buildWebPageSchema(business, {
    type: "WebPage",
    name: pageTitle,
    path: `/${slug}`,
    description: pageDescription,
  });
  const breadcrumbSchema = buildBreadcrumbSchema(business, [
    { name: "Home", path: "/" },
    { name: pageTitle, path: `/${slug}` },
  ]);

  return (
    <>
      <JsonLd data={[webPageSchema, breadcrumbSchema]} />
      <t.GenericPage business={business} page={page} />
    </>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const [page, business] = await Promise.all([
    api.content.getPageBySlug({ slug }),
    api.business.simplifiedGet(),
  ]);

  if (!page || page.type === "blog") return { title: "Page Not Found" };

  const title = !!page.metaTitle ? page.metaTitle : page.title;
  const description = !!page.metaDescription
    ? page.metaDescription
    : (page.excerpt ?? undefined);

  const ogImage =
    page.ogImage ??
    business?.siteContent?.ogImage ??
    business?.siteContent?.logoUrl ??
    undefined;

  return {
    title,
    description,
    ...(business && {
      alternates: {
        canonical: getCanonicalUrl(business, `/${slug}`),
      },
    }),
    openGraph: {
      title,
      description: description ?? "",
      ...(ogImage && { images: [{ url: ogImage, width: 1200, height: 630 }] }),
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description: description ?? "",
      ...(ogImage && { images: [ogImage] }),
    },
  };
}
