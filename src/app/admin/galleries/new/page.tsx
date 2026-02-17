import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { NewGalleryForm } from "../_components/new-gallery-form";
import { TrailHeader } from "../../_components/trail-header";

export default async function NewGalleryPage() {
  const business = await api.business.get();
  if (!business) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Galleries", href: "/admin/galleries" },
          { label: "New Gallery" },
        ]}
      />
      <NewGalleryForm businessId={business.id} />
    </>
  );
}
export const metadata = {
  title: "New Gallery",
};
