import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { CollectionsPage } from "./_components/collections-page";

export default async function AdminCollectionsPage() {
  const collections = await api.collections
    .getAll()
    .catch(rethrowTrpcForErrorBoundary);
  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Collections" }]} />
      <CollectionsPage collections={collections ?? []} />
    </>
  );
}

export const metadata = {
  title: "Collections",
};
