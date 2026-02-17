import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { PagesList } from "../_components/pages-list";
import { TrailHeader } from "../../_components/trail-header";

export default async function PagesListPage() {
  const business = await api.business.get({ includePages: true });
  if (!business) notFound();
  if (!business.siteContent) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Custom Pages" },
        ]}
      />
      <PagesList business={business} />
    </>
  );
}

export const metadata = {
  title: "Custom Pages",
};
