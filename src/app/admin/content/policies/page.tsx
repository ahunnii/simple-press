import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { PoliciesManager } from "./_components/policies-manager";

export default async function PoliciesPage() {
  const business = await api.business.getWithPolicies();
  if (!business) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Policies" },
        ]}
      />
      <HubSubNav hub="content" />
      <PoliciesManager business={business} />
    </>
  );
}

export const metadata = {
  title: "Policies",
};
