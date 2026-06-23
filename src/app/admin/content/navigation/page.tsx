import { notFound } from "next/navigation";

import { db } from "~/server/db";
import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { NavigationBuilder } from "./_components/navigation-builder";

export default async function NavigationPage() {
  const business = await api.business.getWith({
    includeSiteContent: true,
    includePages: true,
  });
  if (!business || !business.siteContent || !business.pages) notFound();

  let siteContent = business?.siteContent;
  siteContent ??= await db.siteContent.create({
    data: { businessId: business.id },
  });

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Navigation" },
        ]}
      />
      <HubSubNav hub="content" />

      <NavigationBuilder
        business={business}
        siteContent={
          siteContent as unknown as {
            navigationItems: {
              label: string;
              href: string;
              external?: boolean;
            }[];
          }
        }
      />
    </>
  );
}

export const metadata = {
  title: "Edit Site Navigation",
};
