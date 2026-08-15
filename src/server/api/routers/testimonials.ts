import crypto from "crypto";
import type { Prisma } from "generated/prisma";
import { BusinessDomainStatus } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "~/env";
import { isPlatformAdmin } from "~/lib/auth/is-platform-admin";
import { captchaFailureToTrpcError } from "~/lib/captcha/trpc-error";
import { verifyRecaptcha } from "~/lib/captcha/verify-recaptcha";
import { checkBusiness } from "~/lib/check-business";
import { splitCustomerName } from "~/lib/customer-name";
import { sendTestimonialInviteEmail } from "~/lib/email/templates";
import {
  getClientIpFromHeaders,
  testimonialSubmitLimiter,
} from "~/lib/rate-limit";
import { normalizeEmail } from "~/lib/utils";
import {
  testimonialBulkApproveSchema,
  testimonialBulkDeleteSchema,
  testimonialBulkHideSchema,
} from "~/lib/validators/testimonials";

import {
  createTRPCRouter,
  featureGate,
  ownerAdminProcedure,
  ownerOnlyProcedure,
  protectedProcedure,
  publicProcedure,
} from "../trpc";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildInviteUrl(
  business: {
    subdomain: string;
    customDomain: string | null;
    domainStatus: BusinessDomainStatus | null;
  },
  code: string,
): string {
  if (
    business.customDomain &&
    business.domainStatus === BusinessDomainStatus.ACTIVE
  ) {
    return `https://${business.customDomain}/testimonials/submit?code=${code}`;
  }
  if (process.env.NODE_ENV === "development") {
    return `http://${business.subdomain}.localhost:3000/testimonials/submit?code=${code}`;
  }
  return `https://${business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}/testimonials/submit?code=${code}`;
}

// `customerEmail`/`customerId` are admin-only PII columns on Testimonial.
// `testimonial.list`'s `canSeeAll` branch (authenticated OWNER/MANAGER/
// PLATFORM_ADMIN) legitimately needs them — e.g.
// `src/app/admin/testimonials/_components/owner-testimonial-dialog.tsx`
// renders/edits `customerEmail`, and is typed against the raw Prisma
// `Testimonial` (not a narrowed RouterOutput), so the admin branch's return
// shape must stay a full `Testimonial[]`. The public branch redacts these
// two (already-nullable) columns to `null` rather than `select()`-ing them
// away, which keeps the row shape — and therefore the TS type both branches
// share — identical; only the value that reaches a public visitor's wire
// payload changes. Exported so the redaction can be pinned by a unit test
// without touching the DB.
export function redactTestimonialForPublic<
  T extends { customerEmail: string | null; customerId: string | null },
>(testimonial: T): T {
  return { ...testimonial, customerEmail: null, customerId: null };
}

// `listRandom` has no admin/`canSeeAll` branch — it is public-only — so its
// leak fix can omit these columns from the query outright instead of
// redacting post-fetch. Exported so the shape can be pinned by a unit test.
export const PUBLIC_TESTIMONIAL_OMIT = {
  customerEmail: true,
  customerId: true,
} as const satisfies Prisma.TestimonialOmit;

// `TestimonialInvite.email` (the invited customer's address) and
// `customerId` are PII, and `getInvite` is a `publicProcedure` keyed on a
// guessable-in-principle `code` — so anyone holding or brute-forcing a code
// used to read the invitee's email straight off the wire. Same bug class as
// the two constants above, but an allow-list `select` rather than a
// deny-list `omit`: `TestimonialInvite` is a small model that will grow, and
// a deny-list re-leaks silently the next time a column is added to it.
//
// `used`/`expiresAt` are here because the validity guards below need them;
// they carry no information on a row that is actually returned (the guards
// throw unless `used === false` and `expiresAt` is in the future), so
// selecting them once and returning them beats a second round-trip.
// `business.subdomain` is retained from the previous projection — it is
// public by construction (it is the hostname the claim page is served from)
// even though the current claim form reads only `business.name`.
// Exported so the shape can be pinned by a unit test without touching the DB.
export const PUBLIC_INVITE_SELECT = {
  maxPhotos: true,
  used: true,
  expiresAt: true,
  business: { select: { name: true, subdomain: true } },
} as const satisfies Prisma.TestimonialInviteSelect;

export const testimonialRouter = createTRPCRouter({
  // ─── PUBLIC ──────────────────────────────────────────────────────────────────

  list: publicProcedure
    .use(featureGate("testimonials"))
    .input(
      z.object({
        publicOnly: z.boolean().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      // A client flag must NEVER widen visibility on a public procedure. Only an
      // authenticated OWNER/MANAGER (or platform admin) of THIS business may see
      // unapproved/hidden testimonials (the admin moderation list). Everyone else
      // is force-scoped to approved + visible.
      let canSeeAll = false;
      if (!input.publicOnly && ctx.session?.user) {
        const user = ctx.session.user;
        if (await isPlatformAdmin(user.id)) {
          canSeeAll = true;
        } else {
          const membership = await ctx.db.businessMembership.findUnique({
            where: {
              userId_businessId: { userId: user.id, businessId: business.id },
            },
            select: { role: true },
          });
          canSeeAll =
            !!membership && ["OWNER", "MANAGER"].includes(membership.role);
        }
      }

      const testimonials = await ctx.db.testimonial.findMany({
        where: {
          businessId: business.id,
          ...(canSeeAll ? {} : { isApproved: true, isHidden: false }),
        },
        orderBy: { testimonialDate: "desc" },
      });

      // Rows widen for `canSeeAll` above; columns must widen with them, not
      // stay open by default — see redactTestimonialForPublic above for why
      // this is a post-fetch redaction rather than a conditional `select`.
      return canSeeAll
        ? testimonials
        : testimonials.map(redactTestimonialForPublic);
    }),

  listRandom: publicProcedure
    .use(featureGate("testimonials"))
    .input(
      z.object({
        limit: z.number().min(1).max(10).default(3),
      }),
    )
    .query(async ({ ctx, input }) => {
      const businessId = await checkBusiness();
      if (!businessId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const all = await ctx.db.testimonial.findMany({
        where: { businessId: businessId.id, isApproved: true, isHidden: false },
        orderBy: { testimonialDate: "desc" },
        // Public-only procedure, no admin branch — omit the PII columns at
        // the query level. See PUBLIC_TESTIMONIAL_OMIT above.
        omit: PUBLIC_TESTIMONIAL_OMIT,
        take: 20,
      });
      const shuffled = [...all].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, input.limit);
    }),

  getInvite: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      // Allow-list projection — see PUBLIC_INVITE_SELECT above. Never widen
      // this to an `include`/bare row: `email` and `customerId` live on this
      // model and this procedure is unauthenticated.
      const invite = await ctx.db.testimonialInvite.findUnique({
        where: { code: input.code },
        select: PUBLIC_INVITE_SELECT,
      });

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      }
      if (invite.used) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite has already been used",
        });
      }
      if (new Date() > invite.expiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite has expired",
        });
      }

      return invite;
    }),

  // ─── CUSTOMER SUBMITTED ───────────────────────────────────────────────────

  canSubmit: protectedProcedure.query(async ({ ctx }) => {
    const business = await checkBusiness();
    if (!business) return { canSubmit: false, reason: "Business not found" };

    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { email: true },
    });

    if (!user) return { canSubmit: false, reason: "User not found" };

    const existing = await ctx.db.testimonial.findFirst({
      where: {
        businessId: business.id,
        customerEmail: user.email,
        source: "customer",
      },
    });

    return {
      canSubmit: !existing,
      reason: existing ? "You have already submitted a testimonial" : undefined,
    };
  }),

  submit: protectedProcedure
    .use(featureGate("testimonials"))
    .input(
      z.object({
        text: z.string().min(10).max(1000),
        photoUrls: z.array(z.string().url()).max(5).default([]),
        captchaToken: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const requestHost = ctx.headers.get("host") ?? "";
      const rawIp = getClientIpFromHeaders(ctx.headers);
      const remoteIp = rawIp === "unknown" ? undefined : rawIp;

      try {
        await testimonialSubmitLimiter.consume(`${rawIp}:${requestHost}`);
      } catch {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many submissions. Please try again later.",
        });
      }

      const business = await checkBusiness();
      if (!business)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });

      // No `NODE_ENV === "development"` short-circuit — see contact.ts for
      // why: verifyRecaptcha owns the test-bypass decision itself now.
      const result = await verifyRecaptcha(input.captchaToken, {
        action: "testimonial",
        requestHost,
        remoteIp,
      });
      if (!result.ok) {
        throw captchaFailureToTrpcError(result.reason);
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true, name: true },
      });

      if (!user)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not found",
        });

      const existing = await ctx.db.testimonial.findFirst({
        where: {
          businessId: business.id,
          customerEmail: user.email,
          source: "customer",
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already submitted a testimonial",
        });
      }

      const normalizedUserEmail = normalizeEmail(user.email);
      const customer = await ctx.db.customer.upsert({
        where: {
          businessId_email: {
            businessId: business.id,
            email: normalizedUserEmail,
          },
        },
        create: {
          businessId: business.id,
          email: normalizedUserEmail,
          // Stores NULL, not "", for a missing half — see splitCustomerName.
          ...splitCustomerName(user.name),
        },
        update: {},
      });

      // Fetch the business setting to determine auto-approve behaviour
      const businessSettings = await ctx.db.business.findUnique({
        where: { id: business.id },
        select: { testimonialsAutoApprove: true },
      });
      const autoApprove = businessSettings?.testimonialsAutoApprove ?? false;

      return ctx.db.testimonial.create({
        data: {
          source: "customer",
          businessId: business.id,
          customerId: customer.id,
          customerEmail: normalizedUserEmail,
          customerName: user.name ?? "Anonymous",
          text: input.text,
          photoUrls: input.photoUrls,
          isApproved: autoApprove,
          isHidden: false,
          testimonialDate: new Date(),
        },
      });
    }),

  submitWithCode: publicProcedure
    .use(featureGate("testimonials"))
    .input(
      z.object({
        code: z.string(),
        name: z.string().min(1),
        text: z.string().min(10).max(1000),
        photoUrls: z.array(z.string().url()).max(5).default([]),
        captchaToken: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const requestHost = ctx.headers.get("host") ?? "";
      const rawIp = getClientIpFromHeaders(ctx.headers);
      const remoteIp = rawIp === "unknown" ? undefined : rawIp;

      try {
        await testimonialSubmitLimiter.consume(`${rawIp}:${requestHost}`);
      } catch {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many submissions. Please try again later.",
        });
      }

      // No `NODE_ENV === "development"` short-circuit — see contact.ts for
      // why: verifyRecaptcha owns the test-bypass decision itself now.
      const result = await verifyRecaptcha(input.captchaToken, {
        action: "testimonial_invite",
        requestHost,
        remoteIp,
      });
      if (!result.ok) {
        throw captchaFailureToTrpcError(result.reason);
      }

      const invite = await ctx.db.testimonialInvite.findUnique({
        where: { code: input.code },
      });

      if (!invite)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid invite code",
        });
      if (invite.used)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite has already been used",
        });
      if (new Date() > invite.expiresAt)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite has expired",
        });

      if (input.photoUrls.length > invite.maxPhotos) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This invite allows up to ${invite.maxPhotos} photo(s)`,
        });
      }

      const existing = await ctx.db.testimonial.findFirst({
        where: {
          businessId: invite.businessId,
          customerEmail: invite.email,
          source: "customer",
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A testimonial has already been submitted for this email",
        });
      }

      const normalizedInviteEmail = normalizeEmail(invite.email);
      const customer = await ctx.db.customer.upsert({
        where: {
          businessId_email: {
            businessId: invite.businessId,
            email: normalizedInviteEmail,
          },
        },
        create: {
          businessId: invite.businessId,
          email: normalizedInviteEmail,
          // Stores NULL, not "", for a missing half — see splitCustomerName.
          ...splitCustomerName(input.name),
        },
        update: {},
      });

      // Fetch the business setting to determine auto-approve behaviour
      const businessSettings = await ctx.db.business.findUnique({
        where: { id: invite.businessId },
        select: { testimonialsAutoApprove: true },
      });
      const autoApprove = businessSettings?.testimonialsAutoApprove ?? false;

      // Same leak class as `getInvite` above, one step further along: this is
      // also a `publicProcedure`, and echoing the created row back would hand
      // whoever redeemed the code the invitee's `customerEmail`/`customerId`.
      // The only consumer (the unauthenticated claim form) reads `isApproved`
      // to pick its thank-you copy, so that is all that goes over the wire.
      const testimonial = await ctx.db.testimonial.create({
        data: {
          source: "customer",
          businessId: invite.businessId,
          customerId: customer.id,
          customerEmail: normalizedInviteEmail,
          customerName: input.name ?? "Anonymous",
          text: input.text,
          photoUrls: input.photoUrls,
          isApproved: autoApprove,
          isHidden: false,
          testimonialDate: new Date(),
        },
        select: { isApproved: true },
      });

      await ctx.db.testimonialInvite.update({
        where: { id: invite.id },
        data: { used: true, usedAt: new Date() },
      });

      return testimonial;
    }),

  // ─── OWNER CREATED ────────────────────────────────────────────────────────

  // Create a testimonial manually
  ownerCreate: ownerAdminProcedure
    .use(featureGate("testimonials"))
    .input(
      z.object({
        customerName: z.string().min(1).max(200),
        customerEmail: z.string().email().optional().nullable(),
        customerTitle: z.string().max(200).optional().nullable(),
        customerCompany: z.string().max(200).optional().nullable(),
        title: z.string().max(300).optional().nullable(),
        text: z.string().min(1).max(5000),
        photoUrls: z.array(z.string().url()).max(5).default([]),
        isApproved: z.boolean().default(true),
        testimonialDate: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      return ctx.db.testimonial.create({
        data: {
          source: "owner",
          businessId,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerTitle: input.customerTitle,
          customerCompany: input.customerCompany,
          title: input.title,
          text: input.text,
          photoUrls: input.photoUrls,
          isApproved: input.isApproved,
          isHidden: false,
          testimonialDate: input.testimonialDate
            ? new Date(input.testimonialDate)
            : new Date(),
        },
      });
    }),

  // Update a testimonial (owner-created only)
  ownerUpdate: ownerAdminProcedure
    .use(featureGate("testimonials"))
    .input(
      z.object({
        id: z.string(),
        customerName: z.string().min(1).max(200).optional(),
        customerEmail: z.string().email().optional().nullable(),
        customerTitle: z.string().max(200).optional().nullable(),
        customerCompany: z.string().max(200).optional().nullable(),
        title: z.string().max(300).optional().nullable(),
        text: z.string().min(1).max(5000).optional(),
        photoUrls: z.array(z.string().url()).max(5).optional(),
        isApproved: z.boolean().optional(),
        isHidden: z.boolean().optional(),
        testimonialDate: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { id, testimonialDate, ...rest } = input;
      const testimonial = await ctx.db.testimonial.findUnique({
        where: { id, businessId },
        select: { source: true },
      });

      if (!testimonial) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Testimonial not found",
        });
      }

      if (testimonial.source !== "owner") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only owner-created testimonials can be edited",
        });
      }

      return ctx.db.testimonial.update({
        where: { id, businessId },
        data: {
          ...rest,
          ...(testimonialDate && {
            testimonialDate: new Date(testimonialDate),
          }),
        },
      });
    }),

  // ─── ADMIN (BOTH TYPES) ───────────────────────────────────────────────────

  updatePhotoUrls: ownerAdminProcedure
    .use(featureGate("testimonials"))
    .input(
      z.object({
        id: z.string(),
        photoUrls: z.array(z.string().url()).max(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      return ctx.db.testimonial.update({
        where: { id: input.id, businessId },
        data: { photoUrls: input.photoUrls },
      });
    }),

  approve: ownerAdminProcedure
    .use(featureGate("testimonials"))
    .input(z.object({ id: z.string(), isApproved: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      return ctx.db.testimonial.update({
        where: { id: input.id, businessId },
        data: { isApproved: input.isApproved },
      });
    }),

  toggleHidden: ownerAdminProcedure
    .use(featureGate("testimonials"))
    .input(z.object({ id: z.string(), isHidden: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      return ctx.db.testimonial.update({
        where: { id: input.id, businessId },
        data: { isHidden: input.isHidden },
      });
    }),

  delete: ownerAdminProcedure
    .use(featureGate("testimonials"))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      return ctx.db.testimonial.delete({ where: { id: input.id, businessId } });
    }),

  // ─── BULK MUTATIONS ───────────────────────────────────────────────────────

  bulkApprove: ownerAdminProcedure
    .use(featureGate("testimonials"))
    .input(testimonialBulkApproveSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // `changedIds` is the rows this call will actually FLIP, captured before
      // the write, and it is what the table's Undo re-sends. Re-sending the
      // whole selection with `isApproved` inverted is not an inverse: a
      // selection containing already-approved rows approves all of them, then
      // "Undo" unapproves all of them — including the ones the user never
      // touched. The client can't narrow it either (a selection spans pages,
      // and off-page rows' `isApproved` state never reaches the browser).
      // Unlike `discount.bulkSetActive` there is no eligibility guard here:
      // testimonials have no expiry materializer that could flip a row back
      // behind the owner's back, so every selected row is fair game.
      //
      // One transaction so nothing can change between the read and the update.
      const { changedIds, count } = await ctx.db.$transaction(async (tx) => {
        const changed = await tx.testimonial.findMany({
          where: {
            id: { in: input.ids },
            businessId,
            isApproved: { not: input.isApproved },
          },
          select: { id: true },
        });

        const result = await tx.testimonial.updateMany({
          where: { id: { in: input.ids }, businessId },
          data: { isApproved: input.isApproved },
        });

        return { changedIds: changed.map((t) => t.id), count: result.count };
      });

      return { count, changedIds };
    }),

  bulkSetHidden: ownerAdminProcedure
    .use(featureGate("testimonials"))
    .input(testimonialBulkHideSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Same undo contract as `bulkApprove` above: `changedIds` is read inside
      // the transaction, before the write, and is the only valid Undo target.
      const { changedIds, count } = await ctx.db.$transaction(async (tx) => {
        const changed = await tx.testimonial.findMany({
          where: {
            id: { in: input.ids },
            businessId,
            isHidden: { not: input.isHidden },
          },
          select: { id: true },
        });

        const result = await tx.testimonial.updateMany({
          where: { id: { in: input.ids }, businessId },
          data: { isHidden: input.isHidden },
        });

        return { changedIds: changed.map((t) => t.id), count: result.count };
      });

      return { count, changedIds };
    }),

  // OWNER only, unlike the two bulk toggles above. Not a statement about
  // trusting managers — it's blast radius. Approve/hide is reversible in one
  // click (and Undo-able); deleting N testimonials is unrecoverable without a
  // database restore, and it takes live storefront content down with it. Same
  // reason the schema's delete cap (ADMIN_BULK_DELETE_LIMIT) sits far below
  // the selection cap the toggles use.
  bulkDelete: ownerOnlyProcedure
    .use(featureGate("testimonials"))
    .input(testimonialBulkDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const result = await ctx.db.testimonial.deleteMany({
        where: { id: { in: input.ids }, businessId },
      });
      return { count: result.count };
    }),

  sendInvite: ownerAdminProcedure
    .use(featureGate("testimonials"))
    .input(
      z.object({
        email: z.string().email(),
        customerId: z.string().optional(),
        maxPhotos: z.number().min(0).max(5).default(3),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Duplicate-invite guard: reject if an active (unused, not-yet-expired) invite already exists
      const existingActive = await ctx.db.testimonialInvite.findFirst({
        where: {
          businessId,
          email: input.email,
          used: false,
          expiresAt: { gt: new Date() },
        },
      });
      if (existingActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An active invitation already exists for this email",
        });
      }

      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: {
          name: true,
          ownerEmail: true,
          subdomain: true,
          customDomain: true,
          domainStatus: true,
          siteContent: {
            select: { logoUrl: true },
          },
        },
      });

      if (!business)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });

      const code = crypto.randomBytes(16).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const invite = await ctx.db.testimonialInvite.create({
        data: {
          businessId,
          email: input.email,
          code,
          expiresAt,
          customerId: input.customerId,
          maxPhotos: input.maxPhotos,
        },
      });

      const inviteUrl = buildInviteUrl(business, code);

      // The invite row above is already committed — sendEmail never throws
      // (see its docblock) — so a Resend failure can't undo that write.
      // Throwing here would report a failed mutation for a write that
      // actually succeeded, so the outcome is surfaced as a return field
      // instead and left for the caller to react to.
      const emailResult = await sendTestimonialInviteEmail({
        to: input.email,
        businessName: business.name,
        inviteUrl,
        logoUrl: business.siteContent?.logoUrl ?? undefined,
        ownerEmail: business.ownerEmail,
      });

      return { ...invite, emailSent: emailResult.success };
    }),

  resendInvite: ownerAdminProcedure
    .use(featureGate("testimonials"))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const invite = await ctx.db.testimonialInvite.findUnique({
        where: { id: input.id, businessId },
      });

      if (!invite)
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      if (invite.used)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite has already been used",
        });

      // Refresh expiry to now+30d on resend
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 30);

      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: {
          name: true,
          ownerEmail: true,
          subdomain: true,
          customDomain: true,
          domainStatus: true,
          siteContent: { select: { logoUrl: true } },
        },
      });

      if (!business)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });

      const updatedInvite = await ctx.db.testimonialInvite.update({
        where: { id: input.id, businessId },
        data: { expiresAt: newExpiresAt },
      });

      const inviteUrl = buildInviteUrl(business, invite.code);

      // Same reasoning as sendInvite above: the expiry refresh is already
      // committed, so a Resend failure is returned rather than thrown.
      const emailResult = await sendTestimonialInviteEmail({
        to: invite.email,
        businessName: business.name,
        inviteUrl,
        logoUrl: business.siteContent?.logoUrl ?? undefined,
        ownerEmail: business.ownerEmail,
      });

      return { ...updatedInvite, emailSent: emailResult.success };
    }),

  cancelInvite: ownerAdminProcedure
    .use(featureGate("testimonials"))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const invite = await ctx.db.testimonialInvite.findUnique({
        where: { id: input.id, businessId },
      });

      if (!invite)
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      if (invite.used)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot cancel a used invite",
        });

      // Expire immediately by setting expiresAt to now
      return ctx.db.testimonialInvite.update({
        where: { id: input.id, businessId },
        data: { expiresAt: new Date() },
      });
    }),

  // Gated like every other admin procedure in this router. Callers were
  // grepped first (migration doc's grep-before-gating rule): the only consumer
  // is the admin testimonials page, which is already behind the same flag, so
  // adding the gate can't 404 a caller that was relying on it being open.
  listInvites: ownerAdminProcedure
    .use(featureGate("testimonials"))
    .query(async ({ ctx }) => {
      return ctx.db.testimonialInvite.findMany({
        where: { businessId: ctx.businessId },
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { firstName: true, lastName: true } },
        },
      });
    }),
});
