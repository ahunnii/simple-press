import { NewGalleryForm } from "../_components/new-gallery-form";
import { TrailHeader } from "../../_components/trail-header";

export default async function NewGalleryPage() {
  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Galleries", href: "/admin/galleries" },
          { label: "New Gallery" },
        ]}
      />
      <NewGalleryForm />
    </>
  );
}
export const metadata = {
  title: "New Gallery",
};
