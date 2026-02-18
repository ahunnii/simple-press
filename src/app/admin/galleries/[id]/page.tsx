import { api } from "~/trpc/server";

import { GalleryEditor } from "../_components/galley-editor";
import { TrailHeader } from "../../_components/trail-header";

type Props = {
  params: Promise<{ id: string }>;
};
export default async function GalleryEditPage({ params }: Props) {
  const { id } = await params;

  const gallery = await api.gallery.getById({ id });

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Galleries", href: "/admin/galleries" },
          { label: gallery.name },
        ]}
      />
      <GalleryEditor gallery={gallery} businessId={gallery.businessId} />
    </>
  );
}
export const metadata = {
  title: "Gallery",
};
