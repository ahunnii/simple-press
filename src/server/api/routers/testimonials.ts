import crypto from "crypto";
import { BusinessDomainStatus } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "~/env";
import { verifyHCaptcha } from "~/lib/captcha/verify-hcaptcha";
import { checkBusiness } from "~/lib/check-business";
import { sendTestimonialInviteEmail } from "~/lib/email/templates";

import {
  createTRPCRouter,
  ownerAdminProcedure,
  protectedProcedure,
  publicProcedure,
} from "../trpc";

export const testimonialRouter = createTRPCRouter({
  // ─── PUBLIC ──────────────────────────────────────────────────────────────────

  list: publicProcedure
    .input(
      z.object({
        publicOnly: z.boolean().default(true),
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

      return ctx.db.testimonial.findMany({
        where: {
          businessId: businessId.id,
          ...(input.publicOnly && { isPublic: true }),
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
        where: { businessId: businessId.id, isPublic: true },
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

  canSubmit: protectedProcedure
    .input(z.object({ businessId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true },
      });

      if (!user) return { canSubmit: false, reason: "User not found" };

      const existing = await ctx.db.testimonial.findFirst({
        where: {
          businessId: input.businessId,
          customerEmail: user.email,
          source: "customer",
        },
      });

      return {
        canSubmit: !existing,
        reason: existing
          ? "You have already submitted a testimonial"
          : undefined,
      };
    }),

  submit: protectedProcedure
    .input(
      z.object({
        businessId: z.string(),
        text: z.string().min(10).max(1000),
        photoUrls: z.array(z.string().url()).max(5).default([]),
        captchaToken: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.captchaToken) {
        const isValid = await verifyHCaptcha(input.captchaToken);
        if (!isValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Captcha verification failed",
          });
        }
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
          businessId: input.businessId,
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

      const customer = await ctx.db.customer.upsert({
        where: {
          businessId_email: { businessId: input.businessId, email: user.email },
        },
        create: {
          businessId: input.businessId,
          email: user.email,
          firstName: user.name?.split(" ")[0],
          lastName: user.name?.split(" ").slice(1).join(" "),
        },
        update: {},
      });

      return ctx.db.testimonial.create({
        data: {
          source: "customer",
          businessId: input.businessId,
          customerId: customer.id,
          customerEmail: user.email,
          customerName: user.name ?? "Anonymous",
          text: input.text,
          photoUrls: input.photoUrls,
          isPublic: true, // Auto-publish on submit
          testimonialDate: new Date(),
        },
      });
    }),

  submitWithCode: publicProcedure
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

      const customer = await ctx.db.customer.upsert({
        where: {
          businessId_email: {
            businessId: invite.businessId,
            email: invite.email,
          },
        },
        create: {
          businessId: invite.businessId,
          email: invite.email,
          firstName: input.name.split(" ")[0],
          lastName: input.name.split(" ").slice(1).join(" "),
        },
        update: {},
      });

      const testimonial = await ctx.db.testimonial.create({
        data: {
          source: "customer",
          businessId: invite.businessId,
          customerId: customer.id,
          customerEmail: invite.email,
          customerName: input.name ?? "Anonymous",
          text: input.text,
          photoUrls: input.photoUrls,
          isPublic: true, // Auto-publish on submit
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
    .input(
      z.object({
        customerName: z.string().min(1),
        customerEmail: z.string().email().optional().nullable(),
        text: z.string().min(1),
        photoUrls: z.array(z.string().url()).max(5).default([]),
        isPublic: z.boolean().default(true),
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
          text: input.text,
          customerEmail: input.customerEmail,
          photoUrls: input.photoUrls,
          isPublic: input.isPublic,
          testimonialDate: input.testimonialDate
            ? new Date(input.testimonialDate)
            : new Date(),
        },
      });
    }),

  // Update a testimonial (owner-created only)
  ownerUpdate: ownerAdminProcedure
    .input(
      z.object({
        id: z.string(),
        customerName: z.string().min(1).optional(),
        customerEmail: z.string().email().optional().nullable(),
        text: z.string().min(1).optional(),
        photoUrls: z.array(z.string().url()).max(5).optional(),
        isPublic: z.boolean().optional(),
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

  togglePublic: ownerAdminProcedure
    .input(z.object({ id: z.string(), isPublic: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      return ctx.db.testimonial.update({
        where: { id: input.id, businessId },
        data: { isPublic: input.isPublic },
      });
    }),

  delete: ownerAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      return ctx.db.testimonial.delete({ where: { id: input.id, businessId } });
    }),

  sendInvite: ownerAdminProcedure
    .input(
      z.object({
        email: z.string().email(),
        customerId: z.string().optional(),
        maxPhotos: z.number().min(0).max(5).default(3),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: {
          name: true,
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

      let inviteUrl = `https://${business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}/testimonials/submit?code=${code}`;
      if (
        business.customDomain &&
        business.domainStatus === BusinessDomainStatus.ACTIVE
      ) {
        inviteUrl = `https://${business.customDomain}/testimonials/submit?code=${code}`;
      }

      if (process.env.NODE_ENV === "development") {
        inviteUrl = `http://${business.subdomain}.localhost:3000/testimonials/submit?code=${code}`;
      }

      await sendTestimonialInviteEmail({
        to: input.email,
        businessName: business.name,
        inviteUrl,
        logoUrl: business.siteContent?.logoUrl ?? undefined,
      });

      return invite;
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
