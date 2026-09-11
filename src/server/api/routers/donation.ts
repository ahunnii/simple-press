import { Prisma } from "generated/prisma";

import { donationSettingsSchema } from "~/lib/validators/donation";
import { createTRPCRouter, ownerAdminProcedure } from "~/server/api/trpc";

/**
 * `donation` router — admin surface for the Donations/Tips feature.
 *
 * Gating philosophy — same split as `subscription.ts`: the `donations`
 * feature flag toggles whether the DONATE PAGE / header / footer links are
 * shown to shoppers (enforced by the storefront routes that own that lane),
 * never the owner's ability to configure the feature ahead of time or read
 * money records after the fact.
 *
 *  - `updateSettings` is deliberately UNGATED — an owner must be able to set
 *    up their label, presets, and Venmo/Cash App handles BEFORE flipping the
 *    feature on in Settings → Features, not be blocked from configuring it
 *    until after.
 *  - `list` is deliberately NOT `featureGate`'d either, matching
 *    `subscription.list`'s precedent (see that router's doc comment): a
 *    donation is a money record, and history must stay readable on
 *    `/admin/donations` even after the owner turns the feature back off.
 */
export const donationRouter = createTRPCRouter({
  /**
   * Narrow mutation — writes ONLY the six donation columns on the caller's
   * business, never a broader spread of `input`. Mirrors the
   * `updateEmailSettings` precedent in `business.ts` (:854-859): a dedicated
   * schema per settings surface avoids a partial-overwrite risk from
   * reconstructing an unrelated mutation's full payload.
   */
  updateSettings: ownerAdminProcedure
    .input(donationSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const {
        donationLabel,
        presetAmounts,
        venmoHandle,
        cashAppHandle,
        donationShowInHeader,
        donationShowInFooter,
      } = input;

      const updatedBusiness = await ctx.db.business.update({
        where: { id: businessId },
        data: {
          donationLabel,
          // `null` (not `[]`) means "no custom presets" to every reader of
          // `Business.donationPresetAmounts` (see the schema comment) — an
          // owner who clears every slot falls back to the lib defaults in
          // `src/lib/donations/constants.ts` rather than showing zero preset
          // buttons. Nullable Json fields need the `Prisma.JsonNull`
          // sentinel; a plain `null` here would be a type error.
          donationPresetAmounts:
            presetAmounts.length > 0
              ? (presetAmounts as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          venmoHandle,
          cashAppHandle,
          donationShowInHeader,
          donationShowInFooter,
        },
      });

      return {
        message: "Donation settings updated successfully",
        business: updatedBusiness,
      };
    }),

  /**
   * Every donation for the caller's business, newest first. Deliberately
   * input-free and unfiltered — the admin page's summary strip (all-time
   * total, this-month total) needs the WHOLE store regardless of what the
   * table is currently searched to, and filters in-memory on the page
   * instead (same `buildTablePage`/`matchesAllTokens` pipeline as
   * Collections/Services/Inventory/Subscriptions).
   *
   * `donorName`/`donorEmail`/`message` are `/// @encrypted`
   * (prisma-field-encryption) — encrypted columns can NEVER appear in a
   * Prisma `where`, so there is no server-side search here to begin with.
   */
  list: ownerAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.donation.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        amountCents: true,
        currency: true,
        donorName: true,
        donorEmail: true,
        message: true,
      },
    });
  }),
});
