import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { BrandingEditor } from "./_components/branding-editor";

export default async function BrandingPage() {
  const business = await api.business.getWith({ includeSiteContent: true });

  if (!business || !business.siteContent) {
    notFound();
  }

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Site Setup", href: "/admin/content" },
          { label: "Brand & Appearance" },
        ]}
      />
      <HubSubNav hub="content" />

      <BrandingEditor business={business} siteContent={business.siteContent} />
    </>
  );
}

export const metadata = {
  title: "Brand & Appearance",
};
