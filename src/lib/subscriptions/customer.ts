import type { Customer } from "generated/prisma";

import type { DbClient } from "~/server/db";
import { splitCustomerName } from "~/lib/customer-name";
import { stripeClient } from "~/lib/stripe/client";
import { normalizeEmail } from "~/lib/utils";

import { isMissingStripeResource } from "./stripe-errors";

/**
 * Customer plumbing for the Subscribe lane: the local `Customer` row and its
 * counterpart Stripe Customer on the store's connected account.
 *
 * A subscription needs a Stripe Customer *before* Checkout, unlike one-time
 * payment mode where Stripe can create one for us — `customer_creation` is
 * rejected in subscription mode. Passing an existing `customer` is also what
 * prefills and locks the email, and what carries the `shipping`/`address` that
 * Stripe Tax reads (subscription mode omits `customer_update`, so those fields
 * are never overwritten at Checkout).
 */

export interface StripeCustomerAddress {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface UpsertLocalCustomerInput {
  businessId: string;
  email: string;
  name?: string | null;
}

/**
 * Find or create the store-scoped `Customer` row for a shopper's email.
 *
 * Mirrors the Stripe webhook's upsert, including its two deliberate rules:
 *
 *  - An existing first/last name is **never** overwritten. A shopper may order
 *    on someone else's behalf and type the recipient's name at checkout;
 *    clobbering the primary record with it corrupts the customer list. A
 *    *missing* half is filled in, which is how a record created by an earlier
 *    partial checkout gets completed.
 *  - A `User` is linked only when that account's email is **verified**.
 *    Linking on an unverified account would hand a stranger who typed someone
 *    else's address at signup their entire order history.
 */
export async function upsertLocalCustomer(
  db: DbClient,
  input: UpsertLocalCustomerInput,
): Promise<Customer> {
  const email = normalizeEmail(input.email);
  const { firstName, lastName } = splitCustomerName(input.name);

  const existingUser = await db.user.findFirst({
    where: { email, emailVerified: true },
    select: { id: true },
  });

  const existing = await db.customer.findUnique({
    where: { businessId_email: { businessId: input.businessId, email } },
    select: { firstName: true, lastName: true },
  });

  return db.customer.upsert({
    where: { businessId_email: { businessId: input.businessId, email } },
    create: {
      businessId: input.businessId,
      email,
      firstName,
      lastName,
      userId: existingUser?.id ?? null,
    },
    update: {
      // Only ever fills a hole. `undefined` leaves the column untouched.
      ...(existing?.firstName ? {} : firstName ? { firstName } : {}),
      ...(existing?.lastName ? {} : lastName ? { lastName } : {}),
      // Keep the user link current (same as the webhook); never unset it.
      ...(existingUser ? { userId: existingUser.id } : {}),
    },
  });
}

export interface EnsureStripeCustomerInput {
  business: { id: string; stripeAccountId: string };
  customer: { id: string; stripeCustomerId: string | null };
  email: string;
  name?: string | null;
  phone?: string | null;
  /**
   * Destination the subscription ships to, or `null` for pickup. When null the
   * `shipping` and `address` keys are omitted **entirely** rather than sent as
   * null — a null `shipping` on a Stripe Customer clears any address already
   * on it, and this same function runs on every repeat subscribe.
   */
  address: StripeCustomerAddress | null;
}

/**
 * Return the Stripe Customer id for this shopper on the connected account,
 * creating it on first use and updating it thereafter.
 *
 * Exactly one Stripe Customer per shopper per store, ever: a second one would
 * split their subscriptions across two records in the owner's Stripe
 * dashboard and break the billing-portal deep link for whichever one wasn't
 * cached locally. The id is persisted on `Customer.stripeCustomerId` in the
 * same call, so the next subscribe reuses it.
 *
 * **Reconnect recovery.** `Customer.stripeCustomerId` is scoped to the
 * BUSINESS, not to the Stripe account — and a business's `stripeAccountId` can
 * change (disconnect + reconnect a different account). The cached id then
 * names a customer that exists on the *old* account, and updating it 404s. One
 * cached id therefore permanently blocks that shopper from ever subscribing
 * again, so a `resource_missing` on update falls through to creating a fresh
 * Customer on the account we are actually talking to and re-persists the id.
 * (Subscriptions already live at the old account keep billing there — that is
 * a documented, deferred limitation, not something this can fix.)
 */
export async function ensureStripeCustomer(
  db: DbClient,
  input: EnsureStripeCustomerInput,
): Promise<string> {
  const { business, customer, email, address } = input;
  const name = input.name?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";

  const stripeAddress = address
    ? {
        line1: address.line1,
        ...(address.line2 ? { line2: address.line2 } : {}),
        city: address.city,
        state: address.state,
        postal_code: address.postalCode,
        country: address.country,
      }
    : null;

  const params = {
    email,
    ...(name ? { name } : {}),
    ...(phone ? { phone } : {}),
    ...(stripeAddress ? { address: stripeAddress } : {}),
    // Stripe requires a name alongside a shipping address.
    ...(stripeAddress && name
      ? {
          shipping: {
            name,
            ...(phone ? { phone } : {}),
            address: stripeAddress,
          },
        }
      : {}),
  };

  if (customer.stripeCustomerId) {
    try {
      await stripeClient.customers.update(customer.stripeCustomerId, params, {
        stripeAccount: business.stripeAccountId,
      });
      return customer.stripeCustomerId;
    } catch (error) {
      // Anything other than "that object isn't on this account" is a real
      // failure (rate limit, outage, bad params) and must surface — silently
      // minting a second Customer for a transient error is exactly the
      // duplicate this function exists to prevent.
      if (!isMissingStripeResource(error)) throw error;
      // Fall through and create a fresh one. See the docblock above.
    }
  }

  const created = await stripeClient.customers.create(params, {
    stripeAccount: business.stripeAccountId,
  });

  await db.customer.update({
    where: { id: customer.id },
    data: { stripeCustomerId: created.id },
  });

  return created.id;
}
