import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCanonicalUrl } from "~/lib/canonical";
import {
  buildBlogPostingSchema,
  buildBreadcrumbSchema,
} from "~/lib/structured-data";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { EMPTY_TIPTAP_DOC } from "~/lib/validators/page";
import { api } from "~/trpc/server";
import { JsonLd } from "~/components/json-ld";

import { getTemplate } from "../../_templates/registry";

type Props = {
  params: Promise<{ slug: string }>;
};

// Templates only ever read metadata (title, slug, excerpt, image, dates)
// off relatedPosts — never the rich-text body — but getBlogPages() returns
// every published blog post's FULL row (including the large Tiptap
// `content` JSON), unbounded. Cap the list and null out `content` before it
// crosses the server/client boundary so a large blog doesn't balloon the
// payload just to render a "related posts" rail.
const RELATED_POSTS_CAP = 20;

export default async function PageView({ params }: Props) {
  const { slug } = await params;
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const relatedPostsRaw = await api.content
    .getBlogPages()
    .catch(rethrowTrpcForErrorBoundary);

  const relatedPosts = relatedPostsRaw
    .filter((p) => p.slug !== slug)
    .slice(0, RELATED_POSTS_CAP)
    .map((p) => ({ ...p, content: EMPTY_TIPTAP_DOC }));

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
