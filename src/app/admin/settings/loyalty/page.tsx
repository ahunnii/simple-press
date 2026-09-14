import Link from "next/link";
import { Info } from "lucide-react";

import { api } from "~/trpc/server";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { LoyaltySettings } from "./_components/loyalty-settings";

export default async function LoyaltySettingsPage() {
  // Ungated read (see the docblock on `loyalty.getSettings`) — this page
  // must render correctly whether or not the `loyalty` flag is on, since one
  // of its two possible alerts below is exactly "this flag is off".
  const settings = await api.loyalty.getSettings();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Rewards" },
        ]}
      />
      <HubSubNav hub="settings" />

      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Rewards program</h1>
            <p>
              Let customers earn points on orders and bonuses, then redeem them
              for single-use discount codes.
            </p>
          </div>
        </div>

        {!settings.flags.loyalty && (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>The Rewards Program feature is turned off</AlertTitle>
            <AlertDescription>
              Turn it on in Features to let customers earn and redeem points.
            </AlertDescription>
            <AlertAction>
              <Button variant="outline" asChild size="xs">
                <Link href="/admin/settings/features">Settings → Features</Link>
              </Button>
            </AlertAction>
          </Alert>
        )}

        {settings.flags.loyalty && !settings.flags.coupons && (
          <Alert variant="warning" className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>
              Redeeming rewards needs Discount Codes turned on
            </AlertTitle>
            <AlertDescription>
              Customers can earn points but can&apos;t redeem them until you
              enable it.
            </AlertDescription>
            <AlertAction>
              <Button variant="outline" asChild size="xs">
                <Link href="/admin/settings/features">Settings → Features</Link>
              </Button>
            </AlertAction>
          </Alert>
        )}
      </div>

      <LoyaltySettings initial={settings} />
    </>
  );
}

export const metadata = {
  title: "Rewards",
};
