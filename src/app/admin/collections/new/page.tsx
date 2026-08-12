import { CollectionForm } from "../_components/collection-form";
import { TrailHeader } from "../../_components/trail-header";

export default function NewCollectionPage() {
  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Collections", href: "/admin/collections" },
          { label: "New Collection" },
        ]}
      />
      <CollectionForm />
    </>
  );
}

export const metadata = {
  title: "New Collection",
};
