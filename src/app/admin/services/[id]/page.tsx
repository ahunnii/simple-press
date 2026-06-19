import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { ServiceEditTabs } from "../_components/service-edit-tabs";
import { TrailHeader } from "../../_components/trail-header";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditServicePage({ params }: PageProps) {
  const { id } = await params;

  const [service, business, flags] = await Promise.all([
    api.services.getById(id).catch(rethrowTrpcForErrorBoundary),
    api.business.getWith({ includeSiteContent: false }),
    getBusinessFlags(),
  ]);

  if (!service) notFound();

  const embedsEnabled = flags.isEnabled("embeds");

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Services", href: "/admin/services" },
          { label: service.name },
        ]}
      />
      <ServiceEditTabs
        service={service}
        embedsEnabled={embedsEnabled}
        storefrontTemplateId={business.templateId}
      />
    </>
  );
}

export const generateMetadata = async ({ params }: PageProps) => {
  const { id } = await params;
  const service = await api.services
    .getById(id)
    .catch(rethrowTrpcForErrorBoundary);
  if (!service) notFound();
  return {
    title: `Edit ${service.name}`,
  };
};
