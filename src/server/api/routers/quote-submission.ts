import type { Prisma } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { QuoteStatusDb } from "~/lib/validators/quote-calculator";
import { verifyRecaptcha } from "~/lib/captcha/verify-recaptcha";
import { checkBusiness } from "~/lib/check-business";
import { notifyDiscordQuoteSubmission } from "~/lib/discord/notification";
import {
  sendFinalQuote,
  sendNewQuoteNotification,
  sendQuoteConfirmation,
} from "~/lib/email/templates";
import { loadZipDataset } from "~/lib/geo/zip-lookup";
import { computeQuote, UNANSWERED_DISPLAY } from "~/lib/quote/evaluate";
import { getClientIpFromHeaders, quoteSubmitLimiter } from "~/lib/rate-limit";
import {
  quoteBulkDeleteSchema,
  quoteBulkRestoreStatusSchema,
  quoteBulkSetStatusSchema,
  quoteCalculatorDefinitionSchema,
  quoteSendFinalQuoteSchema,
  quoteSetFinalQuoteSchema,
  quoteSubmissionAnswerSchema,
  quoteSubmitSchema,
  quoteUpdateStatusSchema,
} from "~/lib/validators/quote-calculator";
import {
  createTRPCRouter,
  featureGate,
  ownerAdminProcedure,
  ownerOnlyProcedure,
  publicProcedure,
} from "~/server/api/trpc";

/** What the visitor is told when the owner's formula fails to evaluate. */
const GENERIC_FAILURE_MESSAGE =
  "We couldn't calculate your estimate. Please try again or contact us directly.";

/** Hard ceiling on the rows `list` ships to the admin inbox. See the comment there. */
const QUOTE_INBOX_MAX_ROWS = 1000;

export const quoteSubmissionRouter = createTRPCRouter({
  // ─── Public: storefront submit ──────────────────────────────────────────────

  /**
   * The one write path a visitor can reach.
   *
   * Order matters and is deliberate: throttle before spending a captcha
   * round-trip, verify the captcha before touching the database, and recompute
   * the price from the STORED definition before writing anything. The client
   * sends option IDs and raw values only — it never sends a price, and nothing
   * it can send introduces a number the owner did not configure.
   */
  submit: publicProcedure
    // 1. Throttle ─────────────────────────────────────────────────────────────
    // A MIDDLEWARE, and it must stay the first one in this chain. `featureGate`
    // below runs `getBusinessFlags()`, which is a database round trip on every
    // call — throttling after it would mean an unauthenticated flood still gets
    // one query each before being told no. Ordering constraint: nothing that
    // touches the database may be inserted above this `.use()`.
    .use(async ({ ctx, next }) => {
      const requestHost = ctx.headers.get("host") ?? "";
      const rawIp = getClientIpFromHeaders(ctx.headers);
      try {
        await quoteSubmitLimiter.consume(`${rawIp}:${requestHost}`);
      } catch {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many submissions. Please try again later.",
        });
      }
      return next();
    })
    .use(featureGate("quoteCalculator"))
    .input(quoteSubmitSchema)
    .mutation(async ({ ctx, input }) => {
      const requestHost = ctx.headers.get("host") ?? "";
      const rawIp = getClientIpFromHeaders(ctx.headers);
      const remoteIp = rawIp === "unknown" ? undefined : rawIp;

      // 2. Captcha ────────────────────────────────────────────────────────────
      // No `NODE_ENV === "development"` short-circuit here — verifyRecaptcha
      // owns the test-bypass decision itself via an explicit sentinel token
      // (RECAPTCHA_TEST_BYPASS_TOKEN), doubly guarded on NODE_ENV !==
      // "production" AND NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS=1, so every call
      // site behaves the same and dev/staging still exercise the real check by
      // default. The action MUST be "quote": one site key serves every form, so
      // without the binding a token minted on the contact form replays here.
      const captcha = await verifyRecaptcha(input.captchaToken, {
        action: "quote",
        requestHost,
        remoteIp,
      });

      if (!captcha.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          // User-facing text stays generic. `reason` rides on `cause` instead
          // of `message` — the tRPC errorFormatter (src/server/api/trpc.ts)
          // only ever serializes a ZodError cause to the client, so this never
          // reaches the browser, but it's inspectable via `error.cause` by
          // anything holding the raw thrown error (e.g. a server-side test
          // exercising the cross-tenant-replay / `host-mismatch` path).
          message: "Captcha verification failed",
          cause: new Error(`recaptcha verification failed: ${captcha.reason}`),
        });
      }

      // 3. Tenant ─────────────────────────────────────────────────────────────
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      // Everything the two emails and the Discord ping need, on one round trip.
      const businessData = await ctx.db.business.findUnique({
        where: { id: business.id },
        select: {
          name: true,
          ownerEmail: true,
          supportEmail: true,
          subdomain: true,
          customDomain: true,
          domainStatus: true,
          siteContent: { select: { logoUrl: true } },
        },
      });

      if (!businessData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      // 4. Calculator ─────────────────────────────────────────────────────────
      const calculator = await ctx.db.quoteCalculator.findUnique({
        where: { id: input.calculatorId, businessId: business.id },
        select: { id: true, name: true, definition: true, published: true },
      });

      // Same indistinguishable missing/unpublished response as
      // `quoteCalculator.getByIdPublic` — an unpublished calculator is a draft
      // price model and must not be submittable through a stale embed.
      if (!calculator?.published) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quote calculator not found",
        });
      }

      // 5. Definition drift ───────────────────────────────────────────────────
      // The definition validated when it was saved, so a parse failure here
      // means the stored shape drifted out from under the schema. That is a
      // developer problem, not a visitor problem: apologize generically, page
      // Sentry.
      const parsedDefinition = quoteCalculatorDefinitionSchema.safeParse(
        calculator.definition,
      );
      if (!parsedDefinition.success) {
        Sentry.captureException(parsedDefinition.error, {
          tags: { feature: "quote", step: "definition-drift" },
          extra: { calculatorId: calculator.id, businessId: business.id },
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: GENERIC_FAILURE_MESSAGE,
        });
      }
      const definition = parsedDefinition.data;

      // 6. Phone ──────────────────────────────────────────────────────────────
      // Enforced server-side because `requirePhone` reaches the browser through
      // the public projection and a runner could be bypassed entirely.
      const contactPhone = input.contactPhone?.trim() ?? "";
      if (definition.requirePhone && contactPhone === "") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Phone number is required",
        });
      }

      // 7. Price ──────────────────────────────────────────────────────────────
      // The dataset is awaited ONCE and read synchronously inside computeQuote
      // — a definition can pair several zip questions, and awaiting per lookup
      // would serialize them behind the same memoized promise for no benefit.
      const dataset = await loadZipDataset();
      const result = computeQuote(
        definition,
        input.answers,
        (zip) => dataset.get(zip) ?? null,
      );

      if (!result.ok) {
        // `formula-failed` is DEFINITION drift surfacing at runtime — a parse
        // error or a variable no question defines. The visitor did nothing
        // wrong and can do nothing about it, so they get the generic apology
        // and we get a Sentry issue. Every other code (missing-required /
        // unknown-option / bad-answer / unknown-zip) is about THIS submission
        // and carries a message written for the visitor.
        //
        // Note what is NOT here: a formula that fails on the visitor's own
        // numbers (divide by a zero they typed, an overflow to Infinity) comes
        // back `ok: true` with a null estimate, because throwing on it would
        // destroy a real lead over a price we can compute by hand later. See
        // `estimateFailure` below and `VALUE_LEVEL_FORMULA_CODES` in
        // `src/lib/quote/evaluate.ts`.
        if (result.error.code === "formula-failed") {
          Sentry.captureException(new Error(result.error.message), {
            tags: { feature: "quote", step: "evaluate" },
            extra: { calculatorId: calculator.id, businessId: business.id },
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: GENERIC_FAILURE_MESSAGE,
          });
        }

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error.message,
        });
      }

      // The answers were all accepted but the formula could not put a number on
      // them for this particular visitor (or the number blew past the storable
      // cap). The submission is still saved, still emailed, still shown as a
      // normal thank-you — only `estimateCents` is null. Logged as a warning,
      // not an exception: it is worth an owner's attention (a divisor question
      // with no `min` of 1, say) but it is not a broken deploy.
      const { estimateCents, estimateFailure } = result;
      if (estimateFailure) {
        Sentry.captureMessage(
          `quote estimate unavailable (${estimateFailure.code}): ${estimateFailure.message}`,
          {
            level: "warning",
            tags: {
              feature: "quote",
              step: "estimate-unavailable",
              reason: estimateFailure.code,
            },
            extra: {
              calculatorId: calculator.id,
              businessId: business.id,
              formula: definition.formula,
              variables: result.variables,
            },
          },
        );
      }

      // 8. Persist ────────────────────────────────────────────────────────────
      // calculatorName / showEstimateToCustomer / formulaSnapshot are copied
      // onto the row, not referenced: the inbox has to render months later,
      // after the calculator has been edited or deleted.
      const contactName = input.contactName.trim();
      const contactEmail = input.contactEmail.trim();

      const submission = await ctx.db.quoteSubmission.create({
        data: {
          businessId: business.id,
          calculatorId: calculator.id,
          calculatorName: calculator.name,
          contactName,
          contactEmail,
          contactPhone: contactPhone === "" ? null : contactPhone,
          answers: result.answerSnapshots as unknown as Prisma.InputJsonValue,
          // Nullable on purpose (`estimateCents Int?`): a lead with a blank
          // estimate is worth infinitely more than no lead. The admin detail
          // page already renders a null estimate.
          estimateCents,
          // Written even when the estimate is null — it is the ONLY record of
          // why: the formula plus the exact variable values that broke it.
          formulaSnapshot: {
            formula: definition.formula,
            variables: result.variables,
          } as Prisma.InputJsonValue,
          showEstimateToCustomer: definition.showEstimateToCustomer,
        },
        select: { id: true },
      });

      // Rows the CUSTOMER may see. Two exclusions, same reasoning: a
      // branched-away question ("Do you need packing? —") and an optional
      // question they chose to skip both render as a title with an em dash,
      // which reads as a bug in a receipt. Skipped-optional rows are NOT
      // hidden — they take the break path in `computeQuote` with
      // `hidden: false` and the unanswered sentinel still on `display` — so
      // the `hidden` check alone does not catch them.
      //
      // The owner's copy keeps every row (see `answers` on the notification
      // below): an owner auditing a price needs to know a question was skipped
      // by branching rather than left blank.
      const visibleRows = result.answerSnapshots
        .filter(
          (row) => row.hidden === false && row.display !== UNANSWERED_DISPLAY,
        )
        .map((row) => ({ title: row.title, display: row.display }));

      // The single source of truth for what the customer is told the price is —
      // shared by the confirmation email and the mutation's return value, so
      // the two can never disagree. `undefined` when the owner keeps the
      // estimate internal, and equally when there is no estimate to tell them
      // about: the thank-you screen and the confirmation email then simply
      // omit pricing, exactly as they do for a calculator with
      // `showEstimateToCustomer` off.
      const customerEstimate =
        definition.showEstimateToCustomer && estimateCents !== null
          ? definition.displayAsRange
            ? {
                lowCents: Math.round(
                  estimateCents * (1 - definition.rangePaddingPercent / 100),
                ),
                highCents: Math.round(
                  estimateCents * (1 + definition.rangePaddingPercent / 100),
                ),
              }
            : { exactCents: estimateCents }
          : undefined;

      // 9. Emails ─────────────────────────────────────────────────────────────
      // Each in its own try/catch: the lead is already saved, and a Resend
      // outage must not turn a captured lead into a client-side error that
      // invites the visitor to submit again.
      try {
        await sendNewQuoteNotification({
          submissionId: submission.id,
          calculatorName: calculator.name,
          contactName,
          contactEmail,
          contactPhone: contactPhone === "" ? null : contactPhone,
          // `null` is the owner's flag that no estimate could be computed —
          // the notification renders an em dash where the figure goes, and the
          // formula + variables section right below it shows exactly which
          // values produced nothing. Their lead is intact; only the number is
          // missing, and they price this one by hand.
          estimateCents,
          answers: result.answerSnapshots.map((row) => ({
            title: row.title,
            display: row.display,
            hidden: row.hidden,
          })),
          formula: definition.formula,
          variables: result.variables,
          business: {
            name: businessData.name,
            ownerEmail: businessData.ownerEmail,
            siteContent: businessData.siteContent,
            subdomain: businessData.subdomain,
            customDomain: businessData.customDomain,
            domainStatus: businessData.domainStatus,
          },
        });
      } catch (emailError) {
        console.error(
          "[Quotes] Failed to send owner notification email:",
          emailError,
        );
        Sentry.captureException(emailError, {
          tags: { feature: "quote", step: "email-owner" },
        });
      }

      try {
        await sendQuoteConfirmation({
          to: contactEmail,
          customerName: contactName,
          calculatorName: calculator.name,
          responseDays: definition.responseDays,
          answers: visibleRows,
          // Omitted entirely unless the owner turned the estimate on — the
          // email is not allowed to reveal more than the thank-you screen.
          ...(customerEstimate ? { estimate: customerEstimate } : {}),
          business: {
            name: businessData.name,
            ownerEmail: businessData.ownerEmail,
            supportEmail: businessData.supportEmail,
            siteContent: businessData.siteContent,
            subdomain: businessData.subdomain,
          },
        });
      } catch (emailError) {
        console.error(
          "[Quotes] Failed to send customer confirmation email:",
          emailError,
        );
        Sentry.captureException(emailError, {
          tags: { feature: "quote", step: "email-customer" },
        });
      }

      // 10. Discord ───────────────────────────────────────────────────────────
      // Fire-and-forget: platform-operator visibility, not part of the
      // visitor's transaction. Never awaited, so a slow webhook cannot add
      // latency to the thank-you screen.
      //
      // Deliberately anonymous. This webhook posts into the PLATFORM operator's
      // channel — a third party to the transaction between a store and its
      // customer — so it carries the shape of the event (which store, which
      // calculator, did it price) and nothing about the person. The name, email
      // and answers stay in the owner's inbox and the owner's email, where the
      // customer expects them to be. Do not add them back for convenience.
      void notifyDiscordQuoteSubmission({
        businessName: businessData.name,
        subdomain: businessData.subdomain,
        calculatorName: calculator.name,
        hasEstimate: estimateCents !== null,
      }).catch((err: unknown) =>
        Sentry.captureException(err, { tags: { service: "discord" } }),
      );

      // 11. Response ──────────────────────────────────────────────────────────
      // The estimate is spread in only when `showEstimateToCustomer` is on, so
      // the client is never handed a number it is not allowed to display.
      // Withholding it in the UI while shipping it over the wire would put the
      // owner's price one devtools tab away.
      return {
        success: true as const,
        ...(customerEstimate ? { estimate: customerEstimate } : {}),
      };
    }),

  // ─── Admin: the lead inbox ──────────────────────────────────────────────────
  //
  // NOTE: every procedure below — list, getById, updateStatus, bulkSetStatus,
  // bulkDelete — is intentionally left ungated by featureGate("quoteCalculator").
  // Submissions are business records: an owner who turns the calculator feature
  // off still has a pipeline of real leads with names, emails and phone numbers
  // to work and eventually delete. Gating these would trap that data with no way
  // to reach or remove it, and would make disabling the feature a destructive
  // act. This mirrors the reviews router's moderation procedures (see
  // src/server/api/routers/review.ts) — do not "fix" the inconsistency by adding
  // a gate here. Only the storefront-facing procedures above, which serve and
  // create new quotes, are gated.

  // Input-free: the admin page filters (status/search), sorts and paginates in
  // memory, so the router ships the tenant-scoped set. The `select` is the
  // table's row contract — `answers` and `formulaSnapshot` are deliberately
  // excluded (they are the heaviest columns on the row and nothing in the list
  // renders them; the detail page reads them through `getById`).
  list: ownerAdminProcedure.query(async ({ ctx }) => {
    const { businessId } = ctx;

    return ctx.db.quoteSubmission.findMany({
      where: { businessId },
      // Bounded, unlike the other in-memory admin lists. Every other one is
      // filled by the owner (products, collections, discounts); this table's
      // rows are created by ANONYMOUS visitors, so its size is set by whoever
      // is submitting — including someone doing so in bulk past the rate
      // limiter. The cap sits far above any real pipeline, so the page keeps
      // its in-memory filter/sort/paginate behavior untouched: it just bounds
      // the working set instead of letting one tenant's inbox become an
      // unbounded serialized payload. Newest first, so the cap trims the
      // stalest leads rather than the ones an owner is working today.
      take: QUOTE_INBOX_MAX_ROWS,
      select: {
        id: true,
        contactName: true,
        contactEmail: true,
        calculatorName: true,
        estimateCents: true,
        finalQuoteCents: true,
        quoteSentAt: true,
        status: true,
        createdAt: true,
      },
      // Stable transport order only (createdAt ties broken by id); the page
      // re-sorts in memory according to its own sort param. The id tiebreak
      // matters — bulk-created rows can share a createdAt to the millisecond,
      // and an unstable order makes selections jump between renders.
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    });
  }),

  getById: ownerAdminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const submission = await ctx.db.quoteSubmission.findUnique({
        where: { id: input.id, businessId },
      });

      if (!submission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quote not found",
        });
      }

      return submission;
    }),

  updateStatus: ownerAdminProcedure
    .input(quoteUpdateStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const existing = await ctx.db.quoteSubmission.findUnique({
        where: { id: input.id, businessId },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quote not found",
        });
      }

      return ctx.db.quoteSubmission.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  // Save an owner-adjusted amount without sending anything. `null` clears the
  // adjustment back to "use the computed estimate". `estimateCents` itself is
  // never written — it is the immutable computed record.
  setFinalQuote: ownerAdminProcedure
    .input(quoteSetFinalQuoteSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const existing = await ctx.db.quoteSubmission.findUnique({
        where: { id: input.id, businessId },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quote not found",
        });
      }

      return ctx.db.quoteSubmission.update({
        where: { id: input.id },
        data: { finalQuoteCents: input.finalQuoteCents },
      });
    }),

  // Persist the amount AND email the customer the final quote with the owner's
  // message. Unlike the submit path's fire-and-forget notifications, the email
  // IS the point here — a delivery failure fails the mutation, and the sent-*
  // snapshot fields are only written after the send succeeds so "Sent" in the
  // UI never lies.
  sendFinalQuote: ownerAdminProcedure
    .input(quoteSendFinalQuoteSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const submission = await ctx.db.quoteSubmission.findUnique({
        where: { id: input.id, businessId },
        select: {
          id: true,
          contactName: true,
          contactEmail: true,
          calculatorName: true,
          status: true,
          answers: true,
        },
      });

      if (!submission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quote not found",
        });
      }

      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: {
          name: true,
          ownerEmail: true,
          supportEmail: true,
          subdomain: true,
          siteContent: { select: { logoUrl: true } },
        },
      });

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      // Snapshot rows are re-parsed defensively; a drifted snapshot degrades
      // to a quote email without the "Your request" section rather than
      // blocking the send.
      const parsedAnswers = z
        .array(quoteSubmissionAnswerSchema)
        .safeParse(submission.answers);
      // Same two exclusions as the confirmation email on the submit path: no
      // branched-away rows, and no "Question —" rows for optional questions the
      // customer skipped. This email quotes a price back to that same customer,
      // so it must not read as if we lost half their answers.
      const visibleAnswers = parsedAnswers.success
        ? parsedAnswers.data
            .filter(
              (answer) =>
                !answer.hidden && answer.display !== UNANSWERED_DISPLAY,
            )
            .map((answer) => ({ title: answer.title, display: answer.display }))
        : [];

      const sendResult = await sendFinalQuote({
        to: submission.contactEmail,
        customerName: submission.contactName,
        calculatorName: submission.calculatorName,
        finalQuoteCents: input.finalQuoteCents,
        message: input.message,
        answers: visibleAnswers,
        business,
      });

      if (!sendResult.success) {
        // sendEmail() now captures the underlying failure to Sentry itself
        // (tagged service: "resend", email.type: "final_quote") — no local
        // capture needed here.
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "The quote email could not be sent. Nothing was saved — please try again.",
        });
      }

      return ctx.db.quoteSubmission.update({
        where: { id: input.id },
        data: {
          finalQuoteCents: input.finalQuoteCents,
          quoteSentAt: new Date(),
          sentQuoteCents: input.finalQuoteCents,
          sentMessage: input.message,
          // Sending the quote IS the first contact — advance a fresh lead so
          // the inbox reflects reality without a second manual step. Anything
          // past NEW (already contacted, won, lost) is left alone.
          ...(submission.status === "NEW" ? { status: "CONTACTED" } : {}),
        },
      });
    }),

  bulkSetStatus: ownerAdminProcedure
    .input(quoteBulkSetStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // `changed` is the rows this call will actually FLIP, captured WITH their
      // prior status before the write. The table's Undo replays those exact
      // pairs through `bulkRestoreStatus`, so a selection whose rows sat in
      // three different statuses restores each one precisely — no group-wide
      // guess, and rows that already had the target status are never touched.
      // One transaction so nothing can change between the read and the update.
      const { changed, count } = await ctx.db.$transaction(async (tx) => {
        const rows = await tx.quoteSubmission.findMany({
          where: {
            id: { in: input.ids },
            businessId,
            status: { not: input.status },
          },
          select: { id: true, status: true },
        });

        const result = await tx.quoteSubmission.updateMany({
          where: { id: { in: input.ids }, businessId },
          data: { status: input.status },
        });

        return {
          changed: rows.map((q) => ({
            id: q.id,
            // The column is String in the schema; every write path validates
            // against QUOTE_STATUS_VALUES_DB, so the narrow is sound.
            previousStatus: q.status as QuoteStatusDb,
          })),
          count: result.count,
        };
      });

      return { count, changed };
    }),

  // Exact inverse for bulkSetStatus's Undo: restores each row to the status
  // captured for it at flip time. Grouped into one updateMany per distinct
  // prior status, all inside a single transaction.
  bulkRestoreStatus: ownerAdminProcedure
    .input(quoteBulkRestoreStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const byStatus = new Map<QuoteStatusDb, string[]>();
      for (const entry of input.entries) {
        const ids = byStatus.get(entry.status) ?? [];
        ids.push(entry.id);
        byStatus.set(entry.status, ids);
      }

      const counts = await ctx.db.$transaction(
        [...byStatus.entries()].map(([status, ids]) =>
          ctx.db.quoteSubmission.updateMany({
            where: { id: { in: ids }, businessId },
            data: { status },
          }),
        ),
      );

      return { count: counts.reduce((sum, r) => sum + r.count, 0) };
    }),

  // OWNER only, unlike the status mutations above. Not a statement about
  // trusting managers — it's blast radius. A status change is reversible in one
  // click (and Undo-able); deleting N leads destroys names, emails, phone
  // numbers and the estimates that went with them, unrecoverable without a
  // database restore. Same reason the schema's delete cap
  // (ADMIN_BULK_DELETE_LIMIT) sits far below the status-change selection cap.
  bulkDelete: ownerOnlyProcedure
    .input(quoteBulkDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const result = await ctx.db.quoteSubmission.deleteMany({
        where: { id: { in: input.ids }, businessId },
      });
      return { count: result.count };
    }),
});
