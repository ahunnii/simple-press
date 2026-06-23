import { notFound } from "next/navigation";

import { getCanonicalUrl } from "~/lib/canonical";
import {
  buildBreadcrumbSchema,
  buildWebPageSchema,
} from "~/lib/structured-data";
import { api } from "~/trpc/server";
import { JsonLd } from "~/components/json-ld";

import { getTemplate } from "../_templates/registry";

export default async function AboutPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const t = getTemplate(business.templateId);

  const webPageSchema = buildWebPageSchema(business, {
    type: "AboutPage",
    name: "About",
    path: "/about",
  });
  const breadcrumbSchema = buildBreadcrumbSchema(business, [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
  ]);

  return (
    <>
      <JsonLd data={[webPageSchema, breadcrumbSchema]} />
      <t.AboutPage business={business} />
    </>
  );
}

export async function generateMetadata() {
  const business = await api.business.simplifiedGet();

  const title = "About";
  const description =
    business?.siteContent?.metaDescription ?? undefined;
  const ogImage =
    business?.siteContent?.ogImage ??
    business?.siteContent?.logoUrl ??
    undefined;

  return {
    title,
    description,
    ...(business && {
      alternates: {
        canonical: getCanonicalUrl(business, "/about"),
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
