import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { TrailHeader } from "~/app/admin/_components/trail-header";

import { PageEditor } from "../../_components/page-editor";

export default async function NewPagePage() {
  const business = await api.business.get();
  if (!business) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Custom Pages", href: "/admin/content/pages" },
          { label: "New Page" },
        ]}
      />
      <PageEditor business={business} />
    </>
  );
}

export const metadata = {
  title: "New Page",
};
