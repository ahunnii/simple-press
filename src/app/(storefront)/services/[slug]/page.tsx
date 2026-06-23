import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCanonicalUrl } from "~/lib/canonical";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import {
  buildBreadcrumbSchema,
  buildServiceSchema,
} from "~/lib/structured-data";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { JsonLd } from "~/components/json-ld";

import { getServiceTemplateComponent } from "../../_templates/_service-pages/registry";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;

  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  // Gate: services feature must be enabled
  const { isEnabled } = await getBusinessFlags();
  if (!isEnabled("services")) notFound();

  // Fetch the service (router throws NOT_FOUND if absent / unpublished)
  const service = await api.services
    .getBySlug(slug)
    .catch(rethrowTrpcForErrorBoundary);

  if (!service) notFound();

  const embedsEnabled = isEnabled("embeds");

  const Component = getServiceTemplateComponent(
    business.templateId,
    service.serviceTemplateId,
  );

  const serviceSchema = buildServiceSchema(service, business);
  const breadcrumbSchema = buildBreadcrumbSchema(business, [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: service.name, path: `/services/${service.slug}` },
  ]);

  return (
    <>
      <JsonLd data={[serviceSchema, breadcrumbSchema]} />
      <Component
        business={business}
        service={service}
        items={service.items}
        embedsEnabled={embedsEnabled}
      />
    </>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const [service, business] = await Promise.all([
    api.services.getBySlug(slug).catch(() => null),
    api.business.simplifiedGet(),
  ]);

  if (!service) return { title: "Service Not Found" };

  const title = service.metaTitle ?? service.name;
  const description =
    service.metaDescription ?? service.description ?? undefined;

  const ogImage =
    service.ogImage ??
    service.image ??
    business?.siteContent?.ogImage ??
    business?.siteContent?.logoUrl ??
    "/placeholder.svg";

  return {
    title,
    description,
    ...(business && {
      alternates: {
        canonical: getCanonicalUrl(business, `/services/${slug}`),
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
