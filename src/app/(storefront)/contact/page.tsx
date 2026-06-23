import { notFound } from "next/navigation";

import { getCanonicalUrl } from "~/lib/canonical";
import {
  buildBreadcrumbSchema,
  buildLocalBusinessSchema,
  buildWebPageSchema,
} from "~/lib/structured-data";
import { api } from "~/trpc/server";
import { JsonLd } from "~/components/json-ld";

import { getTemplate } from "../_templates/registry";

export default async function ContactPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const t = getTemplate(business.templateId);

  const contactPageSchema = buildWebPageSchema(business, {
    type: "ContactPage",
    name: "Contact Us",
    path: "/contact",
  });
  const breadcrumbSchema = buildBreadcrumbSchema(business, [
    { name: "Home", path: "/" },
    { name: "Contact", path: "/contact" },
  ]);

  const schemas: Record<string, unknown>[] = [contactPageSchema, breadcrumbSchema];

  if (business.localBusinessEnabled) {
    schemas.push(buildLocalBusinessSchema(business));
  }

  return (
    <>
      <JsonLd data={schemas} />
      <t.ContactPage business={business} />
    </>
  );
}

export async function generateMetadata() {
  const business = await api.business.simplifiedGet();

  const title = "Contact Us";
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
        canonical: getCanonicalUrl(business, "/contact"),
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
