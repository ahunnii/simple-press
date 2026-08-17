import Link from "next/link";
import { AlertTriangle, ExternalLink } from "lucide-react";

import { getPaymentsHealth } from "~/lib/stripe/payments-health";

type Props = {
  business: {
    id: string;
    /** `Business.stripeAccountId` — null means Connect was never set up, which is a different (and much quieter) problem. */
    stripeAccountId: string | null;
    /** `Business.stripeChargesEnabled` — a hint, not the verdict; see `getPaymentsHealth`. */
    stripeChargesEnabled: boolean;
  };
};

/**
 * Store-wide "Stripe has disabled charges" strip.
 *
 * Async server component, no dismiss: while this is true every checkout on
 * the store fails, so there is no state in which hiding it helps the owner.
 * Renders nothing in the normal case, which is why it is safe to mount on
 * every admin page from the layout.
 *
 * It only speaks when Stripe has CONFIRMED the account is restricted.
 * `stripeChargesEnabled` starts life `false` and is only ever synced by a
 * webhook or the Connect callback, so reading it literally raised this on
 * healthy stores that had simply never been synced (every pre-August account,
 * every environment without webhook delivery). `getPaymentsHealth` verifies a
 * `false` against Stripe first and heals the flag if Stripe disagrees;
 * `unknown` (Stripe unreachable) stays quiet on purpose.
 *
 * Shape: a slim, full-bleed status strip flush above the page's own header —
 * one line, small icon, one sentence, two links — rather than a floating alert
 * card. Persistent, but proportionate: it should read as system status the
 * owner keeps seeing, not an error page. The why-and-how detail lives on
 * Settings → Integrations, which reads the same health value.
 */
export async function PaymentsDisabledBanner({ business }: Props) {
  const health = await getPaymentsHealth(business);
  if (health !== "charges-disabled") return null;

  return (
    <div
      role="status"
      className="border-destructive/25 bg-destructive/[0.06] border-b px-4 py-2 text-sm lg:px-6"
    >
      {/* Icon pinned to the first line; the text column owns the wrapping so
          the links fall under the sentence on narrow screens, not under the
          icon. */}
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="text-destructive mt-0.5 size-4 shrink-0"
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="min-w-0 flex-1 basis-64">
            <span className="text-destructive font-medium">
              Payments are paused.
            </span>{" "}
            <span className="text-foreground/80">
              Stripe has disabled charges on your account, so checkout is
              failing for every shopper.
            </span>
          </p>
          <div className="flex items-center gap-4 font-medium whitespace-nowrap">
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-destructive inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              Fix in Stripe
              <ExternalLink className="size-3.5" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <Link
              href="/admin/settings/integrations"
              className="text-foreground/80 underline-offset-4 hover:underline"
            >
              Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
