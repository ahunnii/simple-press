import type { Prisma } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import { lookupZip } from "~/lib/geo/zip-lookup";
import {
  getClientIpFromHeaders,
  quoteZipLookupLimiter,
} from "~/lib/rate-limit";
import {
  QUOTE_ID_MAX_LENGTH,
  quoteCalculatorCreateSchema,
  quoteCalculatorDefinitionSchema,
  quoteCalculatorUpdateSchema,
  toPublicCalculatorDefinition,
} from "~/lib/validators/quote-calculator";
import {
  createTRPCRouter,
  featureGate,
  ownerAdminProcedure,
  publicProcedure,
} from "~/server/api/trpc";

/**
 * Quote calculator definitions — the owner-authored side of the feature.
 *
 * Everything the storefront is allowed to see comes out of `getByIdPublic`,
 * which is the ONLY procedure here that hands a definition to a browser and the
 * only one that runs it through `toPublicCalculatorDefinition`. The admin reads
 * (`getAll`/`getById`) return the raw stored blob — formula, option values,
 * hidden defaults and all — and are gated behind `ownerAdminProcedure` for
 * exactly that reason. `list` reads the definition too but never returns it:
 * see its note.
 */

/**
 * How many questions a stored definition holds, without trusting its shape.
 *
 * Counted straight off the JSON rather than through
 * `quoteCalculatorDefinitionSchema` on purpose: this feeds a preview card, and
 * a drifted definition should show "0 questions" in the editor, not blow up
 * the picker for every OTHER calculator in the list.
 */
function countQuestions(definition: Prisma.JsonValue): number {
  if (
    definition === null ||
    typeof definition !== "object" ||
    Array.isArray(definition)
  ) {
    return 0;
  }
  const questions = (definition as Record<string, unknown>).questions;
  return Array.isArray(questions) ? questions.length : 0;
}

export const quoteCalculatorRouter = createTRPCRouter({
  // ─── Admin: read ────────────────────────────────────────────────────────────

  // Input-free: the admin list filters/sorts/paginates in memory, so the router
  // just ships the tenant-scoped set. `_count.submissions` powers the "N leads"
  // column — the whole reason an owner opens this page.
  getAll: ownerAdminProcedure
    .use(featureGate("quoteCalculator"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;
      return ctx.db.quoteCalculator.findMany({
        where: { businessId },
        select: {
          id: true,
          name: true,
          published: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { submissions: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
    }),

  // Lean picker feed for the TipTap `quoteCalculator` node view — id/name to
  // render the menu, `published` so the editor can warn about embedding a
  // calculator the storefront will refuse to serve, and `questionCount` for
  // the inserted node's preview card. Deliberately NOT `getAll`: the picker
  // must never pull option values or formulas into the editor bundle. Name
  // order because the picker is an alphabetical menu, not a recency list.
  //
  // `questionCount` is the whole reason the node view no longer calls
  // `getById` — it used to fetch the entire stored definition (formula, option
  // values, hidden defaults) into the editor's client cache just to print
  // "3 questions". The definition is read here, on the server, and only the
  // number crosses the wire. Keep it that way: this procedure's return type is
  // a contract with `quote-calculator-node-view.tsx`.
  list: ownerAdminProcedure
    .use(featureGate("quoteCalculator"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;
      const rows = await ctx.db.quoteCalculator.findMany({
        where: { businessId },
        select: { id: true, name: true, published: true, definition: true },
        orderBy: { name: "asc" },
      });

      return rows.map(({ definition, ...rest }) => ({
        ...rest,
        questionCount: countQuestions(definition),
      }));
    }),

  getById: ownerAdminProcedure
    .use(featureGate("quoteCalculator"))
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const calculator = await ctx.db.quoteCalculator.findUnique({
        where: { id: input.id, businessId },
      });

      if (!calculator) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quote calculator not found",
        });
      }

      return calculator;
    }),

  // ─── Admin: write ───────────────────────────────────────────────────────────

  create: ownerAdminProcedure
    .use(featureGate("quoteCalculator"))
    .input(quoteCalculatorCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      return ctx.db.quoteCalculator.create({
        data: {
          businessId,
          name: input.name,
          published: input.published,
          definition: input.definition as Prisma.InputJsonValue,
        },
      });
    }),

  update: ownerAdminProcedure
    .use(featureGate("quoteCalculator"))
    .input(quoteCalculatorUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const existing = await ctx.db.quoteCalculator.findUnique({
        where: { id: input.id, businessId },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quote calculator not found",
        });
      }

      return ctx.db.quoteCalculator.update({
        where: { id: input.id },
        data: {
          name: input.name,
          published: input.published,
          definition: input.definition as Prisma.InputJsonValue,
        },
      });
    }),

  // Deleting a calculator does NOT delete the leads it produced.
  // `QuoteSubmission.calculatorId` is `onDelete: SetNull`, and every field the
  // quote inbox renders (calculatorName, answers, estimateCents,
  // formulaSnapshot) is snapshotted onto the submission row at submit time —
  // so past quotes stay readable, in full, after the calculator is gone.
  delete: ownerAdminProcedure
    .use(featureGate("quoteCalculator"))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const existing = await ctx.db.quoteCalculator.findUnique({
        where: { id: input.id, businessId },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quote calculator not found",
        });
      }

      await ctx.db.quoteCalculator.delete({
        where: { id: input.id, businessId },
      });

      return { success: true };
    }),

  // ─── Public: storefront reads ───────────────────────────────────────────────

  /**
   * The storefront's view of a calculator.
   *
   * `toPublicCalculatorDefinition` is the security boundary — it strips the
   * formula, the distance variables, every option `value` and every
   * `hiddenDefault` before the definition crosses to the browser. Returning
   * `calculator.definition` raw here would publish the owner's entire price
   * list; nothing else in the app is allowed to serve this column to a
   * non-admin.
   *
   * Tenant resolution is `checkBusiness()`, NOT `getBusinessProcedure()`.
   * They differ in one clause — `status: "active"` — and that clause is what
   * `quoteSubmission.submit` enforces. Resolving them differently meant a
   * suspended store still rendered a working calculator that dead-ended with
   * "Business not found" at the last step, after the visitor had filled in
   * every question and their contact details. The two must agree; the strict
   * one wins. Done locally rather than by changing the shared middleware,
   * which many other public procedures rely on as-is.
   */
  getByIdPublic: publicProcedure
    .use(featureGate("quoteCalculator"))
    .input(z.string().min(1).max(QUOTE_ID_MAX_LENGTH))
    .query(async ({ ctx, input: id }) => {
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quote calculator not found",
        });
      }
      const businessId = business.id;

      const calculator = await ctx.db.quoteCalculator.findUnique({
        where: { id, businessId },
        select: { id: true, name: true, definition: true, published: true },
      });

      // Missing and unpublished are deliberately indistinguishable. An
      // unpublished calculator is a draft price model; a distinct "exists but
      // is not live" response would let anyone with an id enumerate what an
      // owner is working on.
      if (!calculator?.published) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quote calculator not found",
        });
      }

      // Drift guard. A stored definition that no longer satisfies the current
      // schema cannot be safely projected (the public mapper assumes validated
      // shape) and could not be evaluated on submit anyway, so serving it would
      // hand the visitor a form that dead-ends at the last step. Fail closed
      // and page the developer — the owner cannot fix this from the builder.
      const parsed = quoteCalculatorDefinitionSchema.safeParse(
        calculator.definition,
      );
      if (!parsed.success) {
        Sentry.captureException(parsed.error, {
          tags: { feature: "quote", step: "definition-drift" },
          extra: { calculatorId: calculator.id, businessId },
        });
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quote calculator not found",
        });
      }

      return {
        id: calculator.id,
        name: calculator.name,
        definition: toPublicCalculatorDefinition(parsed.data),
      };
    }),

  /**
   * ZIP → city/state for the runner's inline "48601 (Saginaw, MI)" confirmation.
   *
   * Rate limited harder than the submit path because it is keystroke-adjacent:
   * the runner calls it as soon as a 5th digit lands. An unknown ZIP returns
   * `null`, not an error — a visitor typing a valid-but-unlisted ZIP is normal,
   * and only the distance-variable path (in `computeQuote`) treats it as fatal.
   *
   * Same `checkBusiness()` tenant resolution as `getByIdPublic` and
   * `quoteSubmission.submit`, for the same reason: one active-status rule
   * across every public surface of this feature.
   */
  lookupZip: publicProcedure
    // Throttle FIRST, ahead of `featureGate` — which runs `getBusinessFlags()`,
    // a database round trip, on every call. This endpoint fires on a keystroke
    // and answers anonymously, so the limiter has to sit in front of anything
    // that touches the database. Ordering constraint: nothing that queries may
    // be inserted above this `.use()`.
    .use(async ({ ctx, next }) => {
      const requestHost = ctx.headers.get("host") ?? "";
      const rawIp = getClientIpFromHeaders(ctx.headers);
      try {
        await quoteZipLookupLimiter.consume(`${rawIp}:${requestHost}`);
      } catch {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many lookups. Please try again later.",
        });
      }
      return next();
    })
    .use(featureGate("quoteCalculator"))
    .input(z.string().regex(/^\d{5}$/, "Enter a 5-digit ZIP code"))
    .query(async ({ input }) => {
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const entry = await lookupZip(input);
      if (!entry) return null;

      // Coordinates stay server-side: they are only ever an input to a distance
      // variable, and shipping them would let a visitor reconstruct the mileage
      // the price is built on.
      return { city: entry.city, state: entry.state };
    }),
});
