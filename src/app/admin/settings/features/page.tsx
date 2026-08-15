import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { FeatureFlagsEditor } from "./_components/feature-flags-editor";

export default async function FeatureFlagsPage() {
  const { flags } = await getBusinessFlags();

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
    </>
  );
}

export const metadata = {
  title: "Features",
};
