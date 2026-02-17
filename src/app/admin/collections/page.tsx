import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { CollectionsPage } from "./_components/collections-page";

export default async function AdminCollectionsPage() {
  const business = await api.business.get();
  if (!business) notFound();

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Collections" }]} />

      <CollectionsPage businessId={business.id} />
    </>
  );
}

export const metadata = {
  title: "Collections",
};
