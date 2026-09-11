import type Stripe from "stripe";

import { resolveDonationLabel } from "./label";

/**
 * Builder for the `mode: "payment"` donation Stripe Checkout Session.
 *
 * Pure on purpose — the same reasoning as
 * `src/lib/subscriptions/checkout-session.ts`: this is a money surface, and the
 * exact parameter object handed to Stripe is pinned by a unit test so a silent
 * shape change here cannot become a silent pricing change. The I/O lives in the
 * route (`src/app/api/stripe/donations/create-session/route.ts`), which passes
 * what this returns and nothing else.
 *
 * The keys this builder deliberately never emits, and why:
 *
 *  - `automatic_tax` — a donation/tip/contribution is a gift, not a sale of
 *    goods or services, and is generally not subject to sales tax. Stripe Tax
 *    would happily compute one against the store's nexus and add it to the
 *    donor's total. So auto-tax is NOT forwarded even for a store that has
 *    `stripeAutoTaxEnabled` — the flag rides on the input only so the unit test
 *    can prove it is ignored. (A merchant who needs a taxed line item is
 *    selling something, and that is what the one-time checkout lane is for.)
 *  - `payment_intent_data.application_fee_amount` / `transfer_data` — the
 *    platform takes no cut anywhere, and a donation is the last place to start.
 *    Direct charge on the connected account, full amount, same as every other
 *    lane.
 *  - `shipping_address_collection` / `shipping_options` — nothing ships.
 *  - `customer_email` / `customer` — Stripe Checkout collects the donor's email
 *    itself and hands it back on `customer_details`, which is exactly where the
 *    webhook reads it from. There is no pre-payment form to prefill from.
 *  - `expires_at`, `discounts` — a donation has no cart to hold and no coupon
 *    to attach; the amount IS the whole transaction.
 */

/** The business fields the builder reads. A wider object (the full row) is fine. */
export interface DonationCheckoutBusiness {
  id: string;
  /** Shown to the donor in the Checkout line item ("Donation to Bloom Florist"). */
  name: string;
  /** Raw `Business.donationLabel`. Resolved here so one place decides the wording. */
  donationLabel: string | null;
  /** Read only to be deliberately ignored — see the module docblock. */
  stripeAutoTaxEnabled: boolean;
}

export interface DonationCheckoutParamsInput {
  business: DonationCheckoutBusiness;
  /** Storefront origin, no trailing slash (e.g. `https://shop.example.com`). */
  baseUrl: string;
  /** Server-validated amount in cents (`donationCheckoutBodySchema` bounds it). */
  amountCents: number;
  /** Optional donor-supplied name. Absent/blank means anonymous. */
  donorName?: string;
  /** Optional donor-supplied note to the owner. */
  message?: string;
}

/**
 * Build the complete `checkout.sessions.create` parameter object for a
 * donation. Pure: no I/O, no clock, no mutation of the input.
 */
export function buildDonationCheckoutParams(
  input: DonationCheckoutParamsInput,
): Stripe.Checkout.SessionCreateParams {
  const { business, amountCents } = input;
  const baseUrl = input.baseUrl.replace(/\/+$/, "");
  const label = resolveDonationLabel(business.donationLabel);

  const donorName = input.donorName?.trim();
  const donorMessage = input.message?.trim();

  return {
    mode: "payment",
    // Stripe renders a "Donate" button for this value. It is the closest copy
    // Stripe offers for all three owner labels — there is no "Tip"/"Support"
    // submit type — and it beats the default "Pay" for every one of them.
    submit_type: "donate",
    line_items: [
      {
        price_data: {
          // Hardcoded, exactly as the subscription builder does it: the
          // platform prices in USD and nothing upstream can select a currency.
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            // "Donation to Bloom Florist" / "Tip to Bloom Florist" /
            // "Contribution to Bloom Florist" — the noun follows the owner's
            // one label choice so Checkout, the donate page and the owner
            // email can never disagree about what this is called.
            name: `${label.noun} to ${business.name}`,
          },
        },
        quantity: 1,
      },
    ],
    // The webhook's only channel: `businessId` resolves the tenant (and is then
    // bound to `event.account` before anything is written), `kind` is what the
    // route dispatches on, and the two donor fields are carried here rather
    // than in a pre-created DB row because — unlike a subscription — there is
    // no row to pre-create.
    //
    // `donorName`/`donorMessage` are OMITTED entirely when absent, never sent
    // as "": Stripe reads an empty-string metadata value as "delete this key",
    // so the key would come back missing anyway and the "" would only
    // misdescribe what Stripe actually stored. Same lesson as
    // `subscription_data.metadata.variantId` in the subscription builder.
    metadata: {
      businessId: business.id,
      kind: "donation",
      ...(donorName ? { donorName } : {}),
      ...(donorMessage ? { donorMessage } : {}),
    },
    // No `{CHECKOUT_SESSION_ID}` to look up afterwards: there is nothing for
    // the donor to see beyond "thank you", and the Donation row is created by
    // the webhook, not by a success-page read.
    success_url: `${baseUrl}/donate?status=success`,
    cancel_url: `${baseUrl}/donate`,
  };
}
