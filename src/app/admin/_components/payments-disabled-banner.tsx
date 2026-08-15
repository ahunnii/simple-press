import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

type Props = {
  /** `Business.stripeAccountId` — null means Connect was never set up, which is a different (and much quieter) problem. */
  stripeAccountId: string | null;
  /** `Business.stripeChargesEnabled` — synced from the `account.updated` Stripe webhook. */
  stripeChargesEnabled: boolean;
};

/**
 * Store-wide "Stripe has disabled charges" banner.
 *
 * Server component, no dismiss: while this is true every checkout on the store
 * fails, so there is no state in which hiding it helps the owner. Renders
 * nothing in the normal case, which is why it is safe to mount on every admin
 * page from the layout.
 *
 * The narrow condition matters. `stripeChargesEnabled` is `false` by default,
 * so testing it alone would light this up for every store that has simply not
 * connected Stripe yet — a pre-launch store, not a broken one. Requiring a
 * non-null `stripeAccountId` limits it to accounts that Stripe knows about and
 * has restricted.
 */
export function PaymentsDisabledBanner({
  stripeAccountId,
  stripeChargesEnabled,
}: Props) {
  if (!stripeAccountId || stripeChargesEnabled) return null;

  // The outer spacing lives here rather than at the mount site so that the
  // normal (null) case adds no stray padding above every admin page. Matches
  // `.admin-container`'s horizontal rhythm so the banner lines up with the
  // page content beneath it.
  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <Alert variant="destructive" className="border-destructive/50">
        <AlertTriangle />
        <AlertTitle>Your store can&apos;t accept payments right now</AlertTitle>
        <AlertDescription>
          <p>
            Stripe has disabled charges on your connected account, so checkout
            is failing for every shopper. This usually means Stripe needs
            identity or business verification, additional documents, or a
            response to a dispute review.
          </p>
          <p>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Resolve it in your Stripe Dashboard
            </a>{" "}
            — then check{" "}
            <Link href="/admin/settings/integrations">
              Settings → Integrations
            </Link>{" "}
            to confirm the connection is healthy again.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
