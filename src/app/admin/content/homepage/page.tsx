import { notFound } from "next/navigation";

import { db } from "~/server/db";
import { api, HydrateClient } from "~/trpc/server";

import { HomepageEditor } from "../_components/homepage-editor";
import { SiteHeader } from "../../_components/site-header";

export const metadata = {
  title: "Edit Homepage",
};

export default async function HomepagePage() {
  const business = await api.business.secureGetContent();
  if (!business) {
    notFound();
  }

  // Create siteContent if doesn't exist
  let siteContent = business.siteContent;
  siteContent ??= await db.siteContent.create({
    data: {
      businessId: business.id,
    },
  });

  return (
    <HydrateClient>
      <SiteHeader title="Edit Homepage" />
      <div className="admin-container">
        <HomepageEditor business={business} siteContent={siteContent} />
      </div>
    </HydrateClient>
  );
}
