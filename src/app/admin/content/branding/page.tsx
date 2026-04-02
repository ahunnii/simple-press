import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

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
          { label: "Content", href: "/admin/content" },
          { label: "Brand Identity" },
        ]}
      />

      <BrandingEditor business={business} siteContent={business.siteContent} />
    </>
  );
}

export const metadata = {
  title: "Edit Brand Identity",
};
