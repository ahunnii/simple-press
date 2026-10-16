import Link from "next/link";
import { Info } from "lucide-react";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
import { Button } from "~/components/ui/button";

type Props = {
  children: React.ReactNode;
};

/**
 * Layout for the `/admin/marketing` subtree (history, composer, campaign
 * detail). The emailMarketing feature flag is enforced on the tRPC write
 * procedures (marketing.ts uses featureGate("emailMarketing")), and the
 * composer pages redirect when it is off. The read side (past campaigns,
 * campaign detail, the subscriber CSV export) stays available, so when the
 * flag is off we render the children under a notice rather than hiding them.
 */
export default async function AdminMarketingLayout({ children }: Props) {
  const flags = await getBusinessFlags();

  if (flags.isEnabled("emailMarketing")) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="admin-container pt-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Email marketing is turned off</AlertTitle>
          <AlertDescription>
            Past campaigns and the subscriber export are still available. Turn
            on Email Marketing in Features to send new campaigns.
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" asChild size="xs">
              <Link href="/admin/settings/features">Settings → Features</Link>
            </Button>
          </AlertAction>
        </Alert>
      </div>
      {children}
    </>
  );
}
