import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
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

  const { isEnabled } = await getBusinessFlags();
  const servicesEnabled = isEnabled("services");
  const blogEnabled = isEnabled("blog");
  const productsEnabled = isEnabled("products");
  const collectionsEnabled = isEnabled("collections");

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
          { label: "Site Content", href: "/admin/content" },
          { label: "Navigation" },
        ]}
      />
      <HubSubNav hub="content" />

      <NavigationBuilder
        business={business}
        siteContent={{
          navigationItems:
            (business.siteContent.navigationItems as
              | { label: string; href: string; external?: boolean }[]
              | null) ?? [],
        }}
        servicesEnabled={servicesEnabled}
        services={services}
        blogEnabled={blogEnabled}
        productsEnabled={productsEnabled}
        collectionsEnabled={collectionsEnabled}
      />
    </>
  );
}

export const metadata = {
  title: "Edit Site Navigation",
};
