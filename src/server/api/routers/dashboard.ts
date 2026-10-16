import { TRPCError } from "@trpc/server";

import type { DashboardCard } from "~/lib/dashboard/layout-schema";
import type { WidgetAvailabilityContext } from "~/lib/dashboard/widgets";
import type { TxClient } from "~/server/db";
import {
  cardDataInputSchema,
  isCardInputAvailable,
  unavailableCardData,
} from "~/lib/dashboard/card-data";
import {
  dashboardLayoutSaveSchema,
  fillDefaultStatRow,
  getDefaultLayout,
  isCardVisible,
  MAX_DASHBOARD_CARDS,
  parseDashboardLayout,
  splitVisible,
} from "~/lib/dashboard/layout-schema";
import { availableWidgetIds } from "~/lib/dashboard/widgets";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { createTRPCRouter, ownerAdminProcedure } from "~/server/api/trpc";
import {
  clearDashboardLayout,
  findDashboardMembership,
  writeDashboardLayout,
} from "~/server/dashboard/layout";
import { computeCardData } from "~/server/dashboard/metrics";

const NO_MEMBERSHIP_MESSAGE =
  "Only members of this store can customize their dashboard.";

/**
 * One business read -> what the widget registry needs to decide availability.
 * Flags are resolved here (never trusted from the client).
 */
async function loadDashboardBusiness(db: TxClient, businessId: string) {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      createdAt: true,
      timeZone: true,
      businessType: true,
      featureFlags: true,
      umamiEnabled: true,
      umamiWebsiteId: true,
    },
  });
  if (!business) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
  }
  const flags = resolveFlags(business.featureFlags);
  const umamiWebsiteId =
    business.umamiEnabled && business.umamiWebsiteId
      ? business.umamiWebsiteId
      : null;
  const availability: WidgetAvailabilityContext = {
    isEnabled: (key) => flags.isEnabled(key),
    umamiConfigured: umamiWebsiteId !== null,
  };
  return { business, flags, umamiWebsiteId, availability };
}

/**
 * `dashboard` router: the owner dashboard's per-person layout and per-card data.
 *
 * Layouts live on `BusinessMembership.dashboardLayout` (null = never
 * customized -> the default). Everything is `ownerAdminProcedure`; platform
 * admins without a membership read the default and cannot save.
 */
export const dashboardRouter = createTRPCRouter({
  getLayout: ownerAdminProcedure.query(async ({ ctx }) => {
    const { business, availability } = await loadDashboardBusiness(
      ctx.db,
      ctx.businessId,
    );
    const membership = await findDashboardMembership(
      ctx.db,
      ctx.session.user.id,
      ctx.businessId,
    );
    const available = availableWidgetIds(availability);
    const parsed = parseDashboardLayout(membership?.dashboardLayout ?? null, {
      defaultLayout: getDefaultLayout(business.businessType),
      availableIds: available,
    });
    const { usedDefault } = parsed;
    // Only a never-customized dashboard is topped up; a saved layout is
    // exactly what its owner chose.
    const layout = usedDefault
      ? fillDefaultStatRow(parsed.layout, available)
      : parsed.layout;
    const { visible, hidden } = splitVisible(layout, available);
    return {
      layout,
      usedDefault,
      hiddenCards: hidden,
      visibleCards: visible,
      canEdit: membership !== null,
      availableWidgetIds: [...available],
    };
  }),

  saveLayout: ownerAdminProcedure
    .input(dashboardLayoutSaveSchema)
    .mutation(async ({ ctx, input }) => {
      const membership = await findDashboardMembership(
        ctx.db,
        ctx.session.user.id,
        ctx.businessId,
      );
      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: NO_MEMBERSHIP_MESSAGE,
        });
      }

      const { business, availability } = await loadDashboardBusiness(
        ctx.db,
        ctx.businessId,
      );

      // Cards whose feature is off right now are hidden from the editor, so
      // the client can't send them back. Re-attach them from the layout the
      // member was looking at, so turning the feature back on restores them.
      // That is the stored layout, or the default for a never-customized
      // member: getLayout reports the default's feature-off cards as hidden
      // too, and the editor counts them toward the cap and promises they come
      // back, so the first save must keep them.
      // A Trend chart is "off" while the metric it plots is off, so it is
      // re-attached the same way.
      const available = availableWidgetIds(availability);
      const { layout: current } = parseDashboardLayout(
        membership.dashboardLayout,
        {
          defaultLayout: getDefaultLayout(business.businessType),
          availableIds: available,
        },
      );
      const payloadIds = new Set(input.cards.map((card) => card.id));
      const reattached: DashboardCard[] = current.cards.filter(
        (card) => !payloadIds.has(card.id) && !isCardVisible(card, available),
      );

      const cards: DashboardCard[] = [...input.cards, ...reattached];
      if (cards.length > MAX_DASHBOARD_CARDS) {
        const hiddenNote =
          reattached.length > 0
            ? ` ${reattached.length} saved ${reattached.length === 1 ? "card is" : "cards are"} hidden because ${reattached.length === 1 ? "its feature is" : "their features are"} turned off, and still count toward the limit.`
            : "";
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `A dashboard can hold up to ${MAX_DASHBOARD_CARDS} cards.${hiddenNote} Remove a card and try again.`,
        });
      }

      const layout = { version: 1 as const, cards };
      await writeDashboardLayout(ctx.db, membership.id, layout);
      return { layout };
    }),

  resetLayout: ownerAdminProcedure.mutation(async ({ ctx }) => {
    const membership = await findDashboardMembership(
      ctx.db,
      ctx.session.user.id,
      ctx.businessId,
    );
    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: NO_MEMBERSHIP_MESSAGE,
      });
    }
    await clearDashboardLayout(ctx.db, membership.id);
    // Land exactly where getLayout will: the type's default, with its row
    // topped up for the features this store has on.
    const { business, availability } = await loadDashboardBusiness(
      ctx.db,
      ctx.businessId,
    );
    const available = availableWidgetIds(availability);
    const { layout } = parseDashboardLayout(null, {
      defaultLayout: getDefaultLayout(business.businessType),
      availableIds: available,
    });
    return { layout: fillDefaultStatRow(layout, available) };
  }),

  cardData: ownerAdminProcedure
    .input(cardDataInputSchema)
    .query(async ({ ctx, input }) => {
      const { business, flags, umamiWebsiteId, availability } =
        await loadDashboardBusiness(ctx.db, ctx.businessId);

      // A Trend chart is also gated on the metric it plots.
      if (!isCardInputAvailable(input, availability)) {
        return unavailableCardData(
          "feature-off",
          "This card isn't available because its feature is turned off.",
        );
      }

      return computeCardData(
        ctx.db,
        {
          businessId: ctx.businessId,
          timeZone: business.timeZone,
          now: new Date(),
          createdAt: business.createdAt,
          umamiWebsiteId,
          isEnabled: (key) => flags.isEnabled(key),
        },
        input,
      );
    }),
});
