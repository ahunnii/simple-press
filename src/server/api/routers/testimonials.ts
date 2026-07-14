import crypto from "crypto";
import { BusinessDomainStatus } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "~/env";
import { verifyHCaptcha } from "~/lib/captcha/verify-hcaptcha";
import { checkBusiness } from "~/lib/check-business";
import { sendTestimonialInviteEmail } from "~/lib/email/templates";
import {
  getClientIpFromHeaders,
  testimonialSubmitLimiter,
} from "~/lib/rate-limit";
import { normalizeEmail } from "~/lib/utils";

import {
  createTRPCRouter,
  featureGate,
  ownerAdminProcedure,
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

export const testimonialRouter = createTRPCRouter({
  // ─── PUBLIC ──────────────────────────────────────────────────────────────────

  list: publicProcedure
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
        if (user.platformRole === "PLATFORM_ADMIN") {
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

      return ctx.db.testimonial.findMany({
        where: {
          businessId: business.id,
          ...(canSeeAll ? {} : { isApproved: true, isHidden: false }),
        },
        orderBy: { testimonialDate: "desc" },
      });
    }),

  listRandom: publicProcedure
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
        take: 20,
      });
      const shuffled = [...all].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, input.limit);
    }),

  getInvite: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const invite = await ctx.db.testimonialInvite.findUnique({
        where: { code: input.code },
        include: {
          business: { select: { name: true, subdomain: true } },
        },
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
      const ip = `${getClientIpFromHeaders(ctx.headers)}:${ctx.headers.get("host") ?? ""}`;
      try {
        await testimonialSubmitLimiter.consume(ip);
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

      const isValid = await verifyHCaptcha(input.captchaToken);
      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Captcha verification failed",
        });
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
          firstName: user.name?.split(" ")[0],
          lastName: user.name?.split(" ").slice(1).join(" "),
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
      const ip = `${getClientIpFromHeaders(ctx.headers)}:${ctx.headers.get("host") ?? ""}`;
      try {
        await testimonialSubmitLimiter.consume(ip);
      } catch {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many submissions. Please try again later.",
        });
      }

      const isValid = await verifyHCaptcha(input.captchaToken);
      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Captcha verification failed",
        });
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
          firstName: input.name.split(" ")[0],
          lastName: input.name.split(" ").slice(1).join(" "),
        },
        update: {},
      });

      // Fetch the business setting to determine auto-approve behaviour
      const businessSettings = await ctx.db.business.findUnique({
        where: { id: invite.businessId },
        select: { testimonialsAutoApprove: true },
      });
      const autoApprove = businessSettings?.testimonialsAutoApprove ?? false;

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
    .input(
      z.object({ ids: z.array(z.string()).min(1), isApproved: z.boolean() }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      return ctx.db.testimonial.updateMany({
        where: { id: { in: input.ids }, businessId },
        data: { isApproved: input.isApproved },
      });
    }),

  bulkSetHidden: ownerAdminProcedure
    .use(featureGate("testimonials"))
    .input(z.object({ ids: z.array(z.string()).min(1), isHidden: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      return ctx.db.testimonial.updateMany({
        where: { id: { in: input.ids }, businessId },
        data: { isHidden: input.isHidden },
      });
    }),

  bulkDelete: ownerAdminProcedure
    .use(featureGate("testimonials"))
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      return ctx.db.testimonial.deleteMany({
        where: { id: { in: input.ids }, businessId },
      });
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

      await sendTestimonialInviteEmail({
        to: input.email,
        businessName: business.name,
        inviteUrl,
        logoUrl: business.siteContent?.logoUrl ?? undefined,
        ownerEmail: business.ownerEmail,
      });

      return invite;
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

      await sendTestimonialInviteEmail({
        to: invite.email,
        businessName: business.name,
        inviteUrl,
        logoUrl: business.siteContent?.logoUrl ?? undefined,
        ownerEmail: business.ownerEmail,
      });

      return updatedInvite;
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

  listInvites: ownerAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.testimonialInvite.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { firstName: true, lastName: true } },
      },
    });
  }),
});
