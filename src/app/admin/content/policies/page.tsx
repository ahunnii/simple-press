import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { PoliciesManager } from "./_components/policies-manager";

export default async function PoliciesPage() {
  const [business, flags] = await Promise.all([
    api.business.getWithPolicies(),
    getBusinessFlags(),
  ]);
  if (!business) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Site Setup", href: "/admin/content" },
          { label: "Policies" },
        ]}
      />
      <HubSubNav hub="content" />
      <PoliciesManager
        business={business}
        mediaEnabled={flags.isEnabled("media")}
      />
    </>
  );
}

export const metadata = {
  title: "Policies",
};
