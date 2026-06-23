import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { FeatureFlagsEditor } from "./_components/feature-flags-editor";
import { TestimonialSettings } from "./_components/testimonial-settings";

export default async function FeatureFlagsPage() {
  const { flags } = await getBusinessFlags();
  const business = await api.business.getWith({});

  if (!business) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Features" },
        ]}
      />
      <HubSubNav hub="settings" />
      <FeatureFlagsEditor initialFlags={flags} />
      <TestimonialSettings
        testimonialsAutoApprove={business.testimonialsAutoApprove}
      />
    </>
  );
}

export const metadata = {
  title: "Feature Flags",
};
