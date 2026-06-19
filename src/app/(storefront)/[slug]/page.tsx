import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCanonicalUrl } from "~/lib/canonical";
import { api } from "~/trpc/server";

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

  if (!page) notFound();

  const t = getTemplate(business.templateId);

  return <t.GenericPage business={business} page={page} />;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const [page, business] = await Promise.all([
    api.content.getPageBySlug({ slug }),
    api.business.simplifiedGet(),
  ]);

  if (!page) return { title: "Page Not Found" };

  return {
    title: !!page.metaTitle ? page.metaTitle : page.title,
    description: !!page.metaDescription ? page.metaDescription : page.excerpt,
    ...(business && {
      alternates: {
        canonical: getCanonicalUrl(business, `/${slug}`),
      },
    }),
  };
}
