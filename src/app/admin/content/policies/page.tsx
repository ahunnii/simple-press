import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { PoliciesManager } from "../_components/policies-manager";
import { TrailHeader } from "../../_components/trail-header";

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
