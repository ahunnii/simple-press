import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { PagesList } from "./_components/pages-list";

export default async function PagesListPage() {
  const business = await api.business.getWith({ includePages: true });
  if (!business) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Site Content", href: "/admin/content" },
          { label: "Pages" },
        ]}
      />
      <HubSubNav hub="content" />
      <PagesList business={business} />
    </>
  );
}

export const metadata = {
  title: "Pages",
};
