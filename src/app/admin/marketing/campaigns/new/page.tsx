import { redirect } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { getBusinessPostalAddress } from "~/lib/marketing/render-campaign";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { BroadcastComposer } from "../../_components/broadcast-composer";
import { TrailHeader } from "../../../_components/trail-header";

// The composer stays gated while emailMarketing is off: send the owner back to
// history (the layout shows the notice there). Writes are also gated server-side.
export default async function NewCampaignPage() {
  const flags = await getBusinessFlags();
  if (!flags.isEnabled("emailMarketing")) redirect("/admin/marketing");

  const [audience, business] = await Promise.all([
    api.marketing.listRecipients().catch(rethrowTrpcForErrorBoundary),
    api.business.simplifiedGet(),
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
        baseUrl={audience.baseUrl}
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
