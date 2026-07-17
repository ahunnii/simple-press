import Link from "next/link";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";

import { TrailHeader } from "../_components/trail-header";
import { BroadcastComposer } from "./_components/broadcast-composer";

export default async function MarketingPage() {
  // Server-side gate: the emailMarketing feature flag is enforced on the
  // tRPC procedures (marketing.ts uses featureGate("emailMarketing")), but
  // without a page-level check the composer still renders and looks fully
  // functional until the mutation throws a FORBIDDEN error on submit.
  // Mirrors the disabled-state pattern used by
  // /admin/content/announcements for its own feature flags.
  const flags = await getBusinessFlags();
  const emailMarketingEnabled = flags.isEnabled("emailMarketing");

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Email Marketing" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Email Marketing</h1>
            <p>Send a one-off announcement or newsletter to your opted-in customers.</p>
          </div>
        </div>

        {!emailMarketingEnabled ? (
          <div className="border-border rounded-lg border border-dashed p-12 text-center">
            <p className="mb-2 text-lg font-medium">
              Email Marketing is not enabled
            </p>
            <p className="text-muted-foreground mb-6">
              Enable the &ldquo;Email Marketing&rdquo; feature to send
              announcements and newsletters to your opted-in customers.
            </p>
            <Button asChild>
              <Link href="/admin/settings/features">
                Go to Settings → Features
              </Link>
            </Button>
          </div>
        ) : (
          <MarketingComposer />
        )}
      </div>
    </>
  );
}

async function MarketingComposer() {
  const { count } = await api.marketing.listRecipients();
  return <BroadcastComposer recipientCount={count} />;
}

export const metadata = {
  title: "Email Marketing",
};
