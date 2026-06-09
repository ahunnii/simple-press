import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { TrailHeader } from "../../_components/trail-header";
import { PagesList } from "./_components/pages-list";

export default async function PagesListPage() {
  const business = await api.business.getWith({ includePages: true });
  if (!business) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Pages" },
        ]}
      />
      <PagesList business={business} />
    </>
  );
}

export const metadata = {
  title: "Pages",
};
