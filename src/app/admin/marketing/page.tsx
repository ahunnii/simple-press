import Link from "next/link";
import { Plus } from "lucide-react";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";

import { TrailHeader } from "../_components/trail-header";
import { AudienceCard } from "./_components/audience-card";
import { CampaignHistoryTable } from "./_components/campaign-history-table";

// The `emailMarketing` flag gates the composer and the write procedures (see
// ./layout.tsx). History, the audience count and the export stay available.
export default async function MarketingPage() {
  const [audience, firstPage, business, flags] = await Promise.all([
    api.marketing.listRecipients().catch(rethrowTrpcForErrorBoundary),
    api.marketing
      .listCampaigns({ limit: 20 })
      .catch(rethrowTrpcForErrorBoundary),
    api.business.simplifiedGet(),
    getBusinessFlags(),
  ]);
  const emailMarketingEnabled = flags.isEnabled("emailMarketing");

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Email Marketing" }]} />
      <div className="admin-container space-y-6">
        <div className="admin-header">
          <div>
            <h1>Email Marketing</h1>
            <p>
              Send a one-off announcement or newsletter to your opted-in
              customers.
            </p>
          </div>
          {emailMarketingEnabled && (
            <Button asChild>
              <Link href="/admin/marketing/campaigns/new">
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                New campaign
              </Link>
            </Button>
          )}
        </div>

        <AudienceCard
          count={audience.count}
          suppressedCount={audience.suppressedCount}
        />

        <section
          aria-labelledby="campaign-history-heading"
          className="space-y-3"
        >
          <h2 id="campaign-history-heading" className="text-lg font-semibold">
            Campaign history
          </h2>
          <CampaignHistoryTable
            initialPage={firstPage}
            timeZone={business?.timeZone ?? "UTC"}
          />
        </section>
      </div>
    </>
  );
}

export const metadata = {
  title: "Email Marketing",
};
