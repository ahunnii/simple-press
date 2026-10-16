import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { getBusinessPostalAddress } from "~/lib/marketing/render-campaign";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { BroadcastComposer } from "../../_components/broadcast-composer";
import { TrailHeader } from "../../../_components/trail-header";

// The `emailMarketing` flag is enforced for the whole subtree by ../../layout.tsx.
export default async function NewCampaignPage() {
  const [audience, business, flags] = await Promise.all([
    api.marketing.listRecipients().catch(rethrowTrpcForErrorBoundary),
    api.business.simplifiedGet(),
    getBusinessFlags(),
  ]);

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Email Marketing", href: "/admin/marketing" },
          { label: "New campaign" },
        ]}
      />
      <BroadcastComposer
        recipientCount={audience.count}
        mediaEnabled={flags.isEnabled("media")}
        hasPostalAddress={
          business !== null && getBusinessPostalAddress(business) !== null
        }
      />
    </>
  );
}

export const metadata = {
  title: "New campaign",
};
