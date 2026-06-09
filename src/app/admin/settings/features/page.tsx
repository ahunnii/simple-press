import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { getBusinessFlags } from "~/lib/features/get-business-flags";

import { SiteHeader } from "../../_components/site-header";
import { FeatureFlagsEditor } from "./_components/feature-flags-editor";
import { TestimonialSettings } from "./_components/testimonial-settings";

export default async function FeatureFlagsPage() {
  const { flags } = await getBusinessFlags();
  const business = await api.business.getWith({});

  if (!business) notFound();

  return (
    <>
      <SiteHeader title="Features" />
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
