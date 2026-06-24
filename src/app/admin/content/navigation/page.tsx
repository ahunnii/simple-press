import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
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

  const { isEnabled } = await getBusinessFlags();
  const servicesEnabled = isEnabled("services");

  let services: Array<{ name: string; slug: string }> = [];
  if (servicesEnabled) {
    services = (await api.services.getAll())
      .filter((s) => s.published)
      .map((s) => ({ name: s.name, slug: s.slug }));
  }

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
        servicesEnabled={servicesEnabled}
        services={services}
      />
    </>
  );
}

export const metadata = {
  title: "Edit Site Navigation",
};
