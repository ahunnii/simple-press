import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";

import { TrailHeader } from "../_components/trail-header";
import { CollectionsClient } from "./_components/collections-client";

export default async function AdminCollectionsPage() {
  const flags = await getBusinessFlags();
  if (!flags.isEnabled("collections")) {
    return <GenericFeatureDisabledPage featureName="Collections" />;
  }
  const collections = await api.collections
    .getAll()
    .catch(rethrowTrpcForErrorBoundary);

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Collections" }]} />
      <CollectionsClient collections={collections ?? []} />
    </>
  );
}

export const metadata = {
  title: "Collections",
};
