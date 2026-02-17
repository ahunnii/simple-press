import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { SEOEditor } from "../_components/seo-editor";
import { TrailHeader } from "../../_components/trail-header";

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

      <SEOEditor business={business} siteContent={business.siteContent} />
    </>
  );
}

export const metadata = {
  title: "SEO & Meta Settings",
};
