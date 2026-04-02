import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

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
      <PoliciesManager business={business} />
    </>
  );
}

export const metadata = {
  title: "Policies",
};
