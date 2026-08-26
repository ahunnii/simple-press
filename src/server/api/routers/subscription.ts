import type { Subscription } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { DbClient } from "~/server/db";
import { checkBusiness } from "~/lib/check-business";
import { sendSubscriptionManageLinks } from "~/lib/email/templates";
import {
  getClientIpFromHeaders,
  subscriptionLookupLimiter,
  subscriptionManageLimiter,
} from "~/lib/rate-limit";
import {
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  skipNextDelivery,
  SubscriptionActionError,
} from "~/lib/subscriptions/actions";
import {
  buildSubscriptionManageUrl,
  subscriptionIntervalLabel,
  subscriptionPerDeliveryCents,
} from "~/lib/subscriptions/emails";
import { createPaymentMethodUpdateUrl } from "~/lib/subscriptions/portal";
import { syncSubscriptions } from "~/lib/subscriptions/sync";
import { verifySubscriptionToken } from "~/lib/subscriptions/token";
import {
  lookupEmailSchema,
  manageTokenSchema,
  SUBSCRIPTION_STATUS_FILTER_VALUES,
} from "~/lib/validators/subscription";
import {
  createTRPCRouter,
  featureGate,
  ownerAdminProcedure,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

/**
 * `subscription` router (plan §6).
 *
 * Gating philosophy — same split as `quickbooks.ts` and the quote-lead inbox:
 * a feature flag toggles NEW recurring-billing activity, never the customer's
 * ability to get OUT of one or the owner's ability to see money records.
 *
 *  - Public token-scoped reads/writes (`*ByToken`): `getByToken` and
 *    `cancelByToken` are UNGATED — a flag must never trap a customer in
 *    recurring charges, and the manage page must always be able to show what
 *    a subscription is. `pauseByToken` / `resumeByToken` / `skipNextByToken` /
 *    `createPortalSessionByToken` are gated: they are conveniences, not an
 *    exit, so it's fine for the owner to withhold them the moment they turn
 *    the feature off.
 *  - `requestManageLinks` is ungated for the same "must always be able to
 *    cancel" reason — it is the only way a customer without the original
 *    email can find their manage link again.
 *  - `getMine` (signed-in account page) is ungated read-only.
 *  - Admin `list` / `get` / `cancel` are ungated (money records + the escape
 *    hatch survive a flag toggle); `pause` / `resume` / `syncNow` are gated.
 *
 * Every token procedure re-derives the tenant from the request host via
 * `checkBusiness()` and requires the token's own `businessId` to match it —
 * a token minted for store A must 404, not 403, on store B (never reveal
 * that *some* subscription exists for that id).
 */

const subRead = ownerAdminProcedure;
const subGated = ownerAdminProcedure.use(featureGate("subscriptions"));

/** Consume the shared manage-action rate limit; surfaces as TOO_MANY_REQUESTS. */
async function consumeManageLimiter(ctx: { headers: Headers }): Promise<void> {
  try {
    await subscriptionManageLimiter.consume(
      `${getClientIpFromHeaders(ctx.headers)}:${ctx.headers.get("host") ?? ""}`,
    );
  } catch {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please try again later.",
    });
  }
}

/**
 * Resolve a `*ByToken` procedure's tenant + row in one place: verify the
 * signature, require the payload's `businessId` to match the host-resolved
 * business, then load the row scoped to that same business. Any mismatch —
 * garbage token, expired token, wrong tenant, unknown id — collapses to the
 * same `NOT_FOUND`, so a token can never be used to probe which ids exist.
 */
async function loadByToken(
  db: DbClient,
  token: string,
): Promise<{ businessId: string; row: Subscription }> {
  const business = await checkBusiness();
  if (!business) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Subscription not found",
    });
  }

  const payload = verifySubscriptionToken(token);
  if (payload?.businessId !== business.id) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Subscription not found",
    });
  }

  const row = await db.subscription.findFirst({
    where: { id: payload.subscriptionId, businessId: business.id },
  });
  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Subscription not found",
    });
  }

  return { businessId: business.id, row };
}

/**
 * Translate a `SubscriptionActionError` (thrown by `actions.ts`) into the
 * typed tRPC error each caller should see; anything else is unexpected and
 * gets reported.
 */
function mapActionError(
  error: unknown,
  step: string,
  businessId: string,
): TRPCError {
  if (error instanceof SubscriptionActionError) {
    if (error.code === "not_found") {
      return new TRPCError({ code: "NOT_FOUND", message: error.message });
    }
    if (error.code === "invalid_state") {
      return new TRPCError({ code: "BAD_REQUEST", message: error.message });
    }
    // "not_connected" — the store's Stripe connection was lost after the
    // subscription was created. Not the customer's fault and not a 400/404;
    // the owner needs to reconnect Stripe before this action can reach it.
    return new TRPCError({
      code: "PRECONDITION_FAILED",
      message: error.message,
    });
  }

  Sentry.captureException(error, {
    tags: { service: "stripe", "subscription.step": step, businessId },
  });
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
}

/** `getByToken`'s locked-address projection, or `null` for pickup / no snapshot. */
function shippingAddressProjection(row: Subscription) {
  if (row.deliveryMethod === "pickup" || !row.shipAddress1) return null;
  return {
    line1: row.shipAddress1,
    line2: row.shipAddress2,
    city: row.shipCity,
    state: row.shipProvince,
    postalCode: row.shipZip,
    country: row.shipCountry,
  };
}

/** The subset of `Business` every subscription email/URL helper here needs. */
const EMAIL_BUSINESS_SELECT = {
  id: true,
  name: true,
  ownerEmail: true,
  subdomain: true,
  customDomain: true,
  domainStatus: true,
  siteContent: { select: { logoUrl: true } },
} as const;

export const subscriptionRouter = createTRPCRouter({
  // ── public token-scoped ──────────────────────────────────────────────────

  /**
   * The manage page's read model. An explicit allowlist projection — never a
   * bare `return row`, so a new column on `Subscription` (Stripe ids, the
   * encrypted phone) doesn't reach the browser by accident.
   */
  getByToken: publicProcedure
    .input(manageTokenSchema)
    .query(async ({ ctx, input }) => {
      await consumeManageLimiter(ctx);
      const { businessId, row } = await loadByToken(ctx.db, input.token);

      const recentOrders = await ctx.db.order.findMany({
        where: { subscriptionId: row.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          status: true,
          // The question a subscriber actually has about a past delivery is
          // "has it shipped yet", which `status` (open/completed/refunded)
          // does not answer. Both are returned — `status` still drives the
          // cancelled/refunded case.
          fulfillmentStatus: true,
          total: true,
        },
      });

      // Powers the cancelled-state "Subscribe again" link. Scoped to this
      // business like every other read here; null when the owner deleted the
      // product (`Subscription.productId` is SetNull), in which case the
      // manage page falls back to the shop index.
      const productSlug = row.productId
        ? ((
            await ctx.db.product.findFirst({
              where: { id: row.productId, businessId },
              select: { slug: true },
            })
          )?.slug ?? null)
        : null;

      return {
        id: row.id,
        productSlug,
        status: row.status,
        productName: row.productName,
        variantName: row.variantName,
        quantity: row.quantity,
        intervalKey: row.intervalKey,
        intervalLabel: subscriptionIntervalLabel(row),
        unitAmountCents: row.unitAmountCents,
        shippingCents: row.shippingCents,
        deliveryMethod: row.deliveryMethod,
        perDeliveryCents: subscriptionPerDeliveryCents(row),
        shippingAddress: shippingAddressProjection(row),
        currentPeriodEnd: row.currentPeriodEnd,
        nextBillingAt: row.nextBillingAt,
        pauseResumesAt: row.pauseResumesAt,
        cancelledAt: row.cancelledAt,
        cancelReason: row.cancelReason,
        // A card can only be updated once the subscription has actually
        // reached Stripe, and never once it's cancelled for good.
        canUpdatePaymentMethod:
          Boolean(row.stripeSubscriptionId) && row.status !== "cancelled",
        recentOrders,
      };
    }),

  /**
   * Cancel immediately, no refund, no proration — the customer's one
   * always-available action. Deliberately NOT feature-gated: a store owner
   * turning the feature off must never trap someone in recurring charges.
   */
  cancelByToken: publicProcedure
    .input(manageTokenSchema)
    .mutation(async ({ ctx, input }) => {
      await consumeManageLimiter(ctx);
      const { businessId, row } = await loadByToken(ctx.db, input.token);

      try {
        await cancelSubscription(ctx.db, {
          businessId,
          subscriptionId: row.id,
          reason: "customer",
        });
      } catch (error) {
        throw mapActionError(error, "cancelByToken", businessId);
      }

      return { success: true };
    }),

  pauseByToken: publicProcedure
    .use(featureGate("subscriptions"))
    .input(manageTokenSchema)
    .mutation(async ({ ctx, input }) => {
      await consumeManageLimiter(ctx);
      const { businessId, row } = await loadByToken(ctx.db, input.token);

      try {
        await pauseSubscription(ctx.db, {
          businessId,
          subscriptionId: row.id,
        });
      } catch (error) {
        throw mapActionError(error, "pauseByToken", businessId);
      }

      return { success: true };
    }),

  resumeByToken: publicProcedure
    .use(featureGate("subscriptions"))
    .input(manageTokenSchema)
    .mutation(async ({ ctx, input }) => {
      await consumeManageLimiter(ctx);
      const { businessId, row } = await loadByToken(ctx.db, input.token);

      try {
        await resumeSubscription(ctx.db, {
          businessId,
          subscriptionId: row.id,
        });
      } catch (error) {
        throw mapActionError(error, "resumeByToken", businessId);
      }

      return { success: true };
    }),

  skipNextByToken: publicProcedure
    .use(featureGate("subscriptions"))
    .input(manageTokenSchema)
    .mutation(async ({ ctx, input }) => {
      await consumeManageLimiter(ctx);
      const { businessId, row } = await loadByToken(ctx.db, input.token);

      try {
        await skipNextDelivery(ctx.db, {
          businessId,
          subscriptionId: row.id,
        });
      } catch (error) {
        throw mapActionError(error, "skipNextByToken", businessId);
      }

      return { success: true };
    }),

  /** "Update payment method" — a Stripe Customer Portal deep link. */
  createPortalSessionByToken: publicProcedure
    .use(featureGate("subscriptions"))
    .input(manageTokenSchema.extend({ returnUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      await consumeManageLimiter(ctx);
      const { businessId, row } = await loadByToken(ctx.db, input.token);

      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          stripeAccountId: true,
          stripePortalConfigurationId: true,
        },
      });

      try {
        const url = await createPaymentMethodUpdateUrl(ctx.db, {
          business: {
            id: businessId,
            stripeAccountId: business?.stripeAccountId ?? "",
            stripePortalConfigurationId:
              business?.stripePortalConfigurationId ?? null,
          },
          subscription: { stripeCustomerId: row.stripeCustomerId ?? "" },
          returnUrl: input.returnUrl,
        });
        return { url };
      } catch (error) {
        throw mapActionError(error, "createPortalSessionByToken", businessId);
      }
    }),

  /**
   * "Email me my manage links." Always `{ success: true }`, matching
   * `orderLookup.requestLink` — this endpoint must never reveal whether an
   * email has any subscriptions on this store.
   */
  requestManageLinks: publicProcedure
    .input(lookupEmailSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await subscriptionLookupLimiter.consume(
          `${getClientIpFromHeaders(ctx.headers)}:${ctx.headers.get("host") ?? ""}`,
        );
      } catch {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests. Please try again later.",
        });
      }

      const business = await checkBusiness();
      if (!business) return { success: true };

      const rows = await ctx.db.subscription.findMany({
        where: {
          businessId: business.id,
          customerEmail: { equals: input.email, mode: "insensitive" },
          // A subscription that never finished checkout has nothing to
          // manage yet, and surfacing it would only confuse the customer.
          status: { not: "incomplete" },
        },
        orderBy: { createdAt: "desc" },
      });
      if (rows.length === 0) return { success: true };

      const emailBusiness = await ctx.db.business.findUnique({
        where: { id: business.id },
        select: EMAIL_BUSINESS_SELECT,
      });
      if (!emailBusiness) return { success: true };

      const links = rows.map((row) => ({
        // Not part of `sendSubscriptionManageLinks`'s render contract — kept
        // so the sent payload stays traceable back to the row it came from.
        subscriptionId: row.id,
        productName: row.productName,
        variantName: row.variantName,
        intervalLabel: subscriptionIntervalLabel(row),
        status: row.status,
        manageUrl: buildSubscriptionManageUrl(emailBusiness, row),
      }));

      try {
        await sendSubscriptionManageLinks({
          to: rows[0]!.customerEmail,
          links,
          business: emailBusiness,
        });
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            service: "stripe",
            "subscription.step": "requestManageLinks",
            businessId: business.id,
          },
        });
      }

      return { success: true };
    }),

  // ── signed-in account page ──────────────────────────────────────────────

  /**
   * `/account/subscriptions` — the signed-in shopper's own subscriptions.
   *
   * An explicit allowlist projection, same rationale as `getByToken`: a bare
   * `return rows` would leak `stripeSubscriptionId`/`stripeCustomerId`/
   * `stripeCheckoutSessionId` and the decrypted `customerPhone`/`ship*`
   * snapshot to the signed-in customer's own browser.
   */
  getMine: protectedProcedure.query(async ({ ctx }) => {
    const business = await checkBusiness();
    if (!business) return [];

    const emailBusiness = await ctx.db.business.findUnique({
      where: { id: business.id },
      select: EMAIL_BUSINESS_SELECT,
    });
    if (!emailBusiness) return [];

    const customer = await ctx.db.customer.findFirst({
      where: { userId: ctx.session.user.id, businessId: business.id },
      select: { id: true },
    });
    if (!customer) return [];

    const rows = await ctx.db.subscription.findMany({
      where: { customerId: customer.id, businessId: business.id },
      orderBy: { createdAt: "desc" },
    });

    // Batched, not per-row: `productSlug` mirrors `getByToken`'s "resubscribe
    // after cancel" link, scoped to this business like every other read here
    // (`Subscription.productId` should never point across tenants, but the
    // lookup stays businessId-scoped regardless — defence in depth).
    const productIds = [
      ...new Set(
        rows
          .map((row) => row.productId)
          .filter((id): id is string => id !== null),
      ),
    ];
    const products = productIds.length
      ? await ctx.db.product.findMany({
          where: { id: { in: productIds }, businessId: business.id },
          select: { id: true, slug: true },
        })
      : [];
    const slugByProductId = new Map(products.map((p) => [p.id, p.slug]));

    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      productName: row.productName,
      variantName: row.variantName,
      productSlug: row.productId
        ? (slugByProductId.get(row.productId) ?? null)
        : null,
      quantity: row.quantity,
      intervalKey: row.intervalKey,
      intervalLabel: subscriptionIntervalLabel(row),
      unitAmountCents: row.unitAmountCents,
      shippingCents: row.shippingCents,
      perDeliveryCents: subscriptionPerDeliveryCents(row),
      deliveryMethod: row.deliveryMethod,
      nextBillingAt: row.nextBillingAt,
      currentPeriodEnd: row.currentPeriodEnd,
      pauseResumesAt: row.pauseResumesAt,
      cancelledAt: row.cancelledAt,
      createdAt: row.createdAt,
      manageUrl: buildSubscriptionManageUrl(emailBusiness, row),
    }));
  }),

  // ── admin ────────────────────────────────────────────────────────────────

  /**
   * Ungated read: an owner's own subscription list is a money record and
   * must survive the flag being off (same precedent as `quickbooks.listInvoices`).
   */
  list: subRead
    .input(
      z.object({
        status: z.enum(SUBSCRIPTION_STATUS_FILTER_VALUES).optional(),
        search: z.string().trim().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.subscription.findMany({
        where: {
          businessId: ctx.businessId,
          ...(input.status && input.status !== "all"
            ? { status: input.status }
            : {}),
          ...(input.search
            ? {
                OR: [
                  {
                    customerEmail: {
                      contains: input.search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    productName: {
                      contains: input.search,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  get: subRead
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.subscription.findFirst({
        where: { id: input.id, businessId: ctx.businessId },
        include: { orders: { orderBy: { createdAt: "desc" }, take: 20 } },
      });
      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }
      return row;
    }),

  /** Ungated write: the owner's ability to stop billing a customer must never be flag-gated. */
  cancel: subRead
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await cancelSubscription(ctx.db, {
          businessId: ctx.businessId,
          subscriptionId: input.id,
          reason: "owner",
        });
      } catch (error) {
        throw mapActionError(error, "cancel", ctx.businessId);
      }
    }),

  pause: subGated
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await pauseSubscription(ctx.db, {
          businessId: ctx.businessId,
          subscriptionId: input.id,
        });
      } catch (error) {
        throw mapActionError(error, "pause", ctx.businessId);
      }
    }),

  resume: subGated
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await resumeSubscription(ctx.db, {
          businessId: ctx.businessId,
          subscriptionId: input.id,
        });
      } catch (error) {
        throw mapActionError(error, "resume", ctx.businessId);
      }
    }),

  syncNow: subGated.mutation(async ({ ctx }) => {
    const updated = await syncSubscriptions(ctx.db, {
      businessId: ctx.businessId,
      ignoreInterval: true,
    });
    return { updated };
  }),
});
