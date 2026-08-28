import type Stripe from "stripe";

import type { DbClient } from "~/server/db";
import { stripeClient } from "~/lib/stripe/client";

import { isMissingStripeResource } from "./stripe-errors";

/**
 * "Update payment method" deep link into Stripe's Customer Portal, on the
 * store's connected account.
 *
 * SimplePress deliberately does not host a card-update page: doing so would
 * put card data in scope. The portal's `flow_data` deep link drops the
 * customer straight onto the update-card step and redirects them back to their
 * manage page when they're done, so they never see the portal's own home
 * screen.
 */

export interface CreatePaymentMethodUpdateUrlInput {
  business: {
    id: string;
    stripeAccountId: string;
    /** Cached configuration id for this connected account; created on first use. */
    stripePortalConfigurationId: string | null;
  };
  subscription: { stripeCustomerId: string };
  /** Where the portal returns the customer — normally the manage page itself. */
  returnUrl: string;
}

/**
 * Payment-method update ONLY.
 *
 * Every other portal feature is switched off on purpose: the portal is a
 * Stripe-hosted surface that SimplePress receives no synchronous result from,
 * so a cancellation or a plan change made there would leave the local
 * `Subscription` row asserting a state that is no longer true until a webhook
 * (or the cron sweep) caught up. Cancel/pause/skip stay on SimplePress's own
 * manage page, where the local row and Stripe are updated together.
 */
const PORTAL_FEATURES: Stripe.BillingPortal.ConfigurationCreateParams.Features =
  {
    payment_method_update: { enabled: true },
    invoice_history: { enabled: false },
    customer_update: { enabled: false },
    subscription_cancel: { enabled: false },
    subscription_update: { enabled: false },
  };

/**
 * Create a fresh portal Configuration on the connected account and cache its
 * id on the Business.
 *
 * A portal Configuration lives on the CONNECTED account, so it cannot be
 * provisioned at onboarding time from the platform, and creating one per
 * session would litter the owner's Stripe dashboard with identical
 * configurations — hence lazy creation + caching rather than always creating.
 */
async function createAndCacheConfiguration(
  db: DbClient,
  business: CreatePaymentMethodUpdateUrlInput["business"],
): Promise<string> {
  const configuration = await stripeClient.billingPortal.configurations.create(
    { features: PORTAL_FEATURES },
    { stripeAccount: business.stripeAccountId },
  );
  await db.business.update({
    where: { id: business.id },
    data: { stripePortalConfigurationId: configuration.id },
  });
  return configuration.id;
}

async function createSessionUrl(
  business: CreatePaymentMethodUpdateUrlInput["business"],
  subscription: CreatePaymentMethodUpdateUrlInput["subscription"],
  configurationId: string,
  returnUrl: string,
): Promise<string> {
  const session = await stripeClient.billingPortal.sessions.create(
    {
      customer: subscription.stripeCustomerId,
      configuration: configurationId,
      return_url: returnUrl,
      flow_data: {
        type: "payment_method_update",
        after_completion: {
          type: "redirect",
          redirect: { return_url: returnUrl },
        },
      },
    },
    { stripeAccount: business.stripeAccountId },
  );
  return session.url;
}

export async function createPaymentMethodUpdateUrl(
  db: DbClient,
  input: CreatePaymentMethodUpdateUrlInput,
): Promise<string> {
  const { business, subscription, returnUrl } = input;

  let configurationId = business.stripePortalConfigurationId;
  configurationId ??= await createAndCacheConfiguration(db, business);

  try {
    return await createSessionUrl(
      business,
      subscription,
      configurationId,
      returnUrl,
    );
  } catch (error) {
    // Same reconnect scenario `ensureStripeCustomer` (`customer.ts`) recovers
    // from: `Business.stripePortalConfigurationId` is scoped to the business,
    // not to the Stripe account, so a disconnect + reconnect of a DIFFERENT
    // account leaves the cached id naming a Configuration that no longer
    // exists there, and the session create 404s. Only a missing-resource
    // error is retried — anything else (rate limit, outage, bad params) must
    // surface rather than minting a redundant Configuration for a transient
    // failure.
    if (!isMissingStripeResource(error)) throw error;
    configurationId = await createAndCacheConfiguration(db, business);
    return createSessionUrl(business, subscription, configurationId, returnUrl);
  }
}
