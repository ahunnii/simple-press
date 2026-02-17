import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { HomepageEditor } from "../_components/homepage-editor";
import { TrailHeader } from "../../_components/trail-header";

export default async function HomepagePage() {
  const business = await api.business.secureGetContent();
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

      <HomepageEditor business={business} siteContent={business.siteContent} />
    </>
  );
}

export const metadata = {
  title: "Edit Branding",
};
