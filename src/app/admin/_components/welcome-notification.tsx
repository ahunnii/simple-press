import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
import { Button } from "~/components/ui/button";

type Props = {
  /**
   * Whether the store passes the /admin setup gate (isSetupGateComplete:
   * Stripe connected, at least one product, and a custom domain).
   */
  setupComplete: boolean;
};

/**
 * Sidebar footer nudge toward `/admin/welcome`. Hidden once the store passes
 * the same setup gate that decides whether /admin opens the dashboard. A
 * custom domain IS required, so a store on the platform subdomain still sees
 * the nudge.
 */
export default function WelcomeNotification({ setupComplete }: Props) {
  if (setupComplete) {
    return null;
  }
  return (
    <Alert variant="default" className="w-full">
      <AlertTitle>Almost there!</AlertTitle>
      <AlertDescription>
        <p>Complete setup to start selling.</p>{" "}
      </AlertDescription>
      <AlertAction>
        <Button variant="outline" asChild size="xs">
          <Link href="/admin/welcome">
            Finish setup <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </AlertAction>
    </Alert>
  );
}
