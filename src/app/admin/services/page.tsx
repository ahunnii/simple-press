import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";

import { TrailHeader } from "../_components/trail-header";
import { ServicesClient } from "./_components/services-client";

export default async function AdminServicesPage() {
  const flags = await getBusinessFlags();
  if (!flags.isEnabled("services")) {
    return <GenericFeatureDisabledPage featureName="Services" />;
  }

  const services = await api.services
    .getAll()
    .catch(rethrowTrpcForErrorBoundary);

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Services" }]} />
      <ServicesClient services={services ?? []} />
    </>
  );
}

export const metadata = {
  title: "Services",
};
