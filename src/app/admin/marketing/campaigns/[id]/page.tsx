import { notFound, redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { getBusinessPostalAddress } from "~/lib/marketing/render-campaign";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { BroadcastComposer } from "../../_components/broadcast-composer";
import { CampaignDetail } from "../../_components/campaign-detail";
import { TrailHeader } from "../../../_components/trail-header";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * `marketing.getCampaign` throws NOT_FOUND for a missing id AND for another
 * business's campaign (it is tenant-scoped), so both answer with a 404.
 */
async function loadCampaign(id: string) {
  return api.marketing.getCampaign({ id }).catch((error: unknown): never => {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    return rethrowTrpcForErrorBoundary(error);
  });
}

// The `emailMarketing` flag is enforced for the whole subtree by ../../layout.tsx.
export default async function CampaignPage({ params }: Props) {
  const { id } = await params;
  const campaign = await loadCampaign(id);

  const breadcrumbs = [
    { label: "Email Marketing", href: "/admin/marketing" },
    { label: campaign.subject },
  ];

  if (campaign.status === "DRAFT") {
    // A draft opens in the composer, which stays gated while emailMarketing is
    // off. Sent and sending campaigns below remain viewable.
    const flags = await getBusinessFlags();
    if (!flags.isEnabled("emailMarketing")) redirect("/admin/marketing");

    const [audience, business] = await Promise.all([
      api.marketing.listRecipients().catch(rethrowTrpcForErrorBoundary),
      api.business.simplifiedGet(),
    ]);
    return (
      <>
        <TrailHeader breadcrumbs={breadcrumbs} />
        <BroadcastComposer
          campaign={{
            id: campaign.id,
            subject: campaign.subject,
            previewText: campaign.previewText,
            contentFormat: campaign.contentFormat,
            bodyText: campaign.bodyText,
            bodyJson: campaign.bodyJson,
            audience: campaign.audience,
            audienceProductNames: campaign.audienceProductNames,
          }}
          timeZone={business?.timeZone ?? "UTC"}
          mediaEnabled={flags.isEnabled("media")}
          productsEnabled={flags.isEnabled("products")}
          baseUrl={audience.baseUrl}
          recipientCount={audience.count}
          hasPostalAddress={
            business !== null && getBusinessPostalAddress(business) !== null
          }
        />
      </>
    );
  }

  // Scheduled, queued, sending and finished campaigns all get the detail view
  // (a scheduled one is frozen until it is unscheduled back to a draft).
  const [business, flags] = await Promise.all([
    api.business.simplifiedGet(),
    getBusinessFlags(),
  ]);
  return (
    <>
      <TrailHeader breadcrumbs={breadcrumbs} />
      <CampaignDetail
        // Remount if the same URL flips from composer to detail data.
        key={campaign.id}
        initialCampaign={campaign}
        timeZone={business?.timeZone ?? "UTC"}
        emailMarketingEnabled={flags.isEnabled("emailMarketing")}
      />
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const campaign = await api.marketing.getCampaign({ id }).catch(() => null);
  return { title: campaign?.subject ?? "Campaign" };
}
