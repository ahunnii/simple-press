import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { BrandingEditor } from "../_components/homepage-editor";
import { TrailHeader } from "../../_components/trail-header";

export default async function BrandingPage() {
  const business = await api.business.getWith({ includeSiteContent: true });

  if (!business || !business.siteContent) {
    notFound();
  }

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Branding" },
        ]}
      />

      <BrandingEditor business={business} siteContent={business.siteContent} />
    </>
  );
}

export const metadata = {
  title: "Edit Branding",
};
