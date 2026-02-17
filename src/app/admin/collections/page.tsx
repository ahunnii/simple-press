import { TrailHeader } from "../_components/trail-header";
import { CollectionsPage } from "./_components/collections-page";

export default async function AdminCollectionsPage() {
  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Collections" }]} />

      <CollectionsPage />
    </>
  );
}

export const metadata = {
  title: "Collections",
};
