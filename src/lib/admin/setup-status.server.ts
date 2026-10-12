import "server-only";

import { cache } from "react";

import type { ResolvedSetupPlan } from "~/lib/admin/setup-plan";
import type { SetupFacts, SetupStatus } from "~/lib/admin/setup-steps";
import type { ResolvedFlags } from "~/lib/features/resolve-flags";
import {
  areRequiredPoliciesLive,
  REQUIRED_POLICY_PAGES_SELECT,
  REQUIRED_POLICY_PAGES_WHERE,
} from "~/lib/admin/policies-live";
import {
  parseSetupConfirmations,
  resolveSetupPlan,
} from "~/lib/admin/setup-plan";
import { computeSetupStatus } from "~/lib/admin/setup-steps";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { db } from "~/server/db";

export type LoadedSetupStatus = {
  status: SetupStatus;
  facts: SetupFacts;
  /** The store's plan (type + per-step levels) the status was computed from. */
  plan: ResolvedSetupPlan;
  /** The store's resolved feature flags, from the same row. */
  flags: ResolvedFlags;
  /**
   * The setup gate: `/admin` opens the dashboard and the sidebar nudge hides.
   * True once the launch latch is set (`setupCompletedAt`) OR every required
   * step is done now — so a required step added after launch shows on the
   * checklist but never sends a live store back into setup.
   */
  gateComplete: boolean;
  /** When the store first finished its required steps; null = not yet. */
  setupCompletedAt: Date | null;
  /**
   * Rides along for the admin layout's payments-disabled strip, so it costs no
   * extra round trip (a `true` is trusted; only a `false` is verified against
   * Stripe, see `getPaymentsHealth`).
   */
  stripeChargesEnabled: boolean;
};

/**
 * Load a store's setup checklist in ONE query: the plan columns, the facts
 * each step's completion rule reads, product/service counts, the siteContent
 * bits behind "customized", and the two required policy pages.
 *
 * Shared by `/admin/welcome`, the dashboard's "Finish setting up" card, the
 * platform hub's business page, and (for stores still in setup) the gate in
 * `loadSetupGate`, so they all agree on what "set up" means. Wrapped in
 * React `cache()`: the admin layout and the page share one query per request.
 *
 * Also sets the launch latch: the first time every required step is done,
 * `setupCompletedAt` is stamped (once — guarded on it still being null).
 *
 * Returns `null` when the business doesn't exist.
 */
export const loadSetupStatus = cache(
  async (businessId: string): Promise<LoadedSetupStatus | null> => {
    const business = await db.business.findUnique({
      where: { id: businessId },
      select: {
        businessType: true,
        setupSteps: true,
        setupConfirmations: true,
        setupCompletedAt: true,
        featureFlags: true,
        stripeAccountId: true,
        stripeChargesEnabled: true,
        stripeAutoTaxEnabled: true,
        customDomain: true,
        shippingType: true,
        offersInStorePickup: true,
        venmoHandle: true,
        cashAppHandle: true,
        phoneNumber: true,
        supportEmail: true,
        addressStreet: true,
        siteContent: { select: { logoUrl: true, customFields: true } },
        pages: {
          where: REQUIRED_POLICY_PAGES_WHERE,
          select: REQUIRED_POLICY_PAGES_SELECT,
        },
        _count: { select: { products: true, services: true } },
      },
    });

    if (!business) return null;

    const facts: SetupFacts = {
      stripeAccountId: business.stripeAccountId,
      customDomain: business.customDomain,
      productCount: business._count.products,
      serviceCount: business._count.services,
      stripeAutoTaxEnabled: business.stripeAutoTaxEnabled,
      shippingType: business.shippingType,
      offersInStorePickup: business.offersInStorePickup,
      venmoHandle: business.venmoHandle,
      cashAppHandle: business.cashAppHandle,
      phoneNumber: business.phoneNumber,
      supportEmail: business.supportEmail,
      addressStreet: business.addressStreet,
      policiesLive: areRequiredPoliciesLive(business.pages),
      siteContent: business.siteContent,
    };

    const plan = resolveSetupPlan(business);
    const flags = resolveFlags(business.featureFlags);
    const status = computeSetupStatus({
      plan,
      isFeatureEnabled: flags.isEnabled,
      facts,
      confirmations: parseSetupConfirmations(business.setupConfirmations),
    });

    let setupCompletedAt = business.setupCompletedAt;
    if (!setupCompletedAt && status.requiredComplete) {
      setupCompletedAt = new Date();
      // `updateMany` + null guard: concurrent loads can't move the stamp.
      await db.business.updateMany({
        where: { id: businessId, setupCompletedAt: null },
        data: { setupCompletedAt },
      });
    }

    return {
      status,
      facts,
      plan,
      flags,
      gateComplete: setupCompletedAt !== null,
      setupCompletedAt,
      stripeChargesEnabled: business.stripeChargesEnabled,
    };
  },
);

export type SetupGate = {
  gateComplete: boolean;
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean;
};

/**
 * The setup gate alone, for the hot paths (`/admin` redirect, admin layout's
 * sidebar nudge — the layout runs on EVERY admin page). A launched store
 * (`setupCompletedAt` set) answers from a few scalar columns; only a store
 * still in setup pays for the full `loadSetupStatus` read (policy content,
 * template fields), which also stamps the latch once it passes.
 *
 * Returns `null` when the business doesn't exist.
 */
export const loadSetupGate = cache(
  async (businessId: string): Promise<SetupGate | null> => {
    const business = await db.business.findUnique({
      where: { id: businessId },
      select: {
        setupCompletedAt: true,
        stripeAccountId: true,
        stripeChargesEnabled: true,
      },
    });

    if (!business) return null;

    if (business.setupCompletedAt) {
      return {
        gateComplete: true,
        stripeAccountId: business.stripeAccountId,
        stripeChargesEnabled: business.stripeChargesEnabled,
      };
    }

    const setup = await loadSetupStatus(businessId);
    return {
      gateComplete: setup?.gateComplete ?? false,
      stripeAccountId: business.stripeAccountId,
      stripeChargesEnabled: business.stripeChargesEnabled,
    };
  },
);
