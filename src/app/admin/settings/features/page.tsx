import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { api } from "~/trpc/server";

import { SiteHeader } from "../../_components/site-header";
import { FeatureFlagsEditor } from "./_components/feature-flags-editor";

export default async function FeatureFlagsPage() {
  const business = await api.business.simplifiedGet();

  const { flags } = await getBusinessFlags(business.id);

  return (
    <>
      <SiteHeader title="Features" />
      <FeatureFlagsEditor initialFlags={flags} />
    </>
  );
}

export const metadata = {
  title: "Feature Flags",
};
