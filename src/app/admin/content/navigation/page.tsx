import { notFound } from "next/navigation";

import { db } from "~/server/db";
import { api } from "~/trpc/server";

import { NavigationBuilder } from "../_components/navigation-builder";
import { TrailHeader } from "../../_components/trail-header";

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
  title: "Update Navigation",
};
