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
  /** Whether the business has connected Stripe. */
  stripeConnected: boolean;
  /** Whether the business has at least one product. */
  hasProducts: boolean;
};

/**
 * Sidebar footer nudge toward `/admin/welcome`. Hidden once the storefront
 * is actually sellable — Stripe connected AND at least one product. A custom
 * domain is NOT required: a subdomain store is a legitimate finished setup.
 */
export default function WelcomeNotification({
  stripeConnected,
  hasProducts,
}: Props) {
  if (stripeConnected && hasProducts) {
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
