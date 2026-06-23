import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { SEOEditor } from "./_components/seo-editor";

export default async function SEOPage() {
  const business = await api.business.getWith({ includeSiteContent: true });
  if (!business) notFound();
  if (!business.siteContent) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "SEO & Meta" },
        ]}
      />
      <HubSubNav hub="content" />

      <SEOEditor business={business} siteContent={business.siteContent} />
    </>
  );
}

export const metadata = {
  title: "SEO & Meta Settings",
};
