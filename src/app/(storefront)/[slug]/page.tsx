import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  buildPageMetadata,
  firstNonBlank,
  getCachedBusiness,
  preferNonBlank,
} from "~/lib/seo";
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
  const business = await getCachedBusiness();
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

  // Blank-aware: a cleared `metaTitle` comes back as "" and must fall through
  // to the real title rather than feed an empty `name` into the JSON-LD.
  const pageTitle = preferNonBlank(page.metaTitle, page.title);
  const pageDescription = firstNonBlank(page.metaDescription, page.excerpt);

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
    getCachedBusiness(),
  ]);

  if (!page || page.type === "blog") return { title: "Page Not Found" };

  return buildPageMetadata({
    business,
    path: `/${slug}`,
    title: page.title,
    description: page.excerpt,
    keywords: page.metaKeywords,
    entity: {
      title: page.metaTitle,
      description: page.metaDescription,
      ogImage: page.ogImage,
    },
    // Page image is the natural share image, ahead of the site-wide OG
    // image / logo the helper falls back to.
    ogImage: page.image,
  });
}
