import { getBusinessFlags } from "~/lib/features/get-business-flags";

import { SiteHeader } from "../../_components/site-header";
import { FeatureFlagsEditor } from "./_components/feature-flags-editor";

export default async function FeatureFlagsPage() {
  const { flags } = await getBusinessFlags();

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
