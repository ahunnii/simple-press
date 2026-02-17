import crypto from "crypto";
import type { PrismaClient } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { sendTestimonialInviteEmail } from "~/lib/email/templates";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

// Shared ownership check helper
async function assertOwner(
  db: PrismaClient,
  userId: string,
  businessId: string,
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { businessId: true },
  });

  if (user?.businessId !== businessId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not authorized",
    });
  }
}

// Shared testimonial ownership check helper
async function assertTestimonialOwner(
  db: PrismaClient,
  userId: string,
  testimonialId: string,
) {
  const testimonial = await db.testimonial.findUnique({
    where: { id: testimonialId },
    select: { businessId: true, source: true },
  });

  if (!testimonial) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Testimonial not found",
    });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { businessId: true },
  });

  if (user?.businessId !== testimonial.businessId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
  }

  return testimonial;
}

export const testimonialRouter = createTRPCRouter({
  // ─── PUBLIC ──────────────────────────────────────────────────────────────────

  list: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        publicOnly: z.boolean().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.testimonial.findMany({
        where: {
          businessId: input.businessId,
          ...(input.publicOnly && { isPublic: true }),
        },
        orderBy: { testimonialDate: "desc" },
      });
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
        rating: z.number().min(1).max(5),
        text: z.string().min(10).max(1000),
        videoUrl: z.string().url().optional(),
        photoUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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
          customerName: user.name || user.email,
          rating: input.rating,
          text: input.text,
          videoUrl: input.videoUrl,
          photoUrl: input.photoUrl,
          isPublic: false, // Always requires owner approval
        },
      });
    }),

  submitWithCode: publicProcedure
    .input(
      z.object({
        code: z.string(),
        name: z.string().min(1),
        rating: z.number().min(1).max(5),
        text: z.string().min(10).max(1000),
        videoUrl: z.string().url().optional(),
        photoUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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
          customerName: input.name,
          rating: input.rating,
          text: input.text,
          videoUrl: input.videoUrl,
          photoUrl: input.photoUrl,
          isPublic: false,
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
  ownerCreate: protectedProcedure
    .input(
      z.object({
        businessId: z.string(),
        customerName: z.string().min(1),
        customerEmail: z.string().email().optional(),
        customerTitle: z.string().optional(),
        customerCompany: z.string().optional(),
        rating: z.number().min(1).max(5),
        title: z.string().optional(),
        text: z.string().min(1),
        videoUrl: z.string().url().optional(),
        photoUrl: z.string().url().optional(),
        isPublic: z.boolean().default(true), // Owner-created are public by default
        testimonialDate: z.string().optional(), // ISO string for backdating
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwner(ctx.db, ctx.session.user.id, input.businessId);

      return ctx.db.testimonial.create({
        data: {
          source: "owner",
          businessId: input.businessId,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerTitle: input.customerTitle,
          customerCompany: input.customerCompany,
          rating: input.rating,
          title: input.title,
          text: input.text,
          videoUrl: input.videoUrl,
          photoUrl: input.photoUrl,
          isPublic: input.isPublic,
          testimonialDate: input.testimonialDate
            ? new Date(input.testimonialDate)
            : new Date(),
        },
      });
    }),

  // Update a testimonial (owner-created only)
  ownerUpdate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        customerName: z.string().min(1).optional(),
        customerEmail: z.string().email().optional().nullable(),
        customerTitle: z.string().optional().nullable(),
        customerCompany: z.string().optional().nullable(),
        rating: z.number().min(1).max(5).optional(),
        title: z.string().optional().nullable(),
        text: z.string().min(1).optional(),
        videoUrl: z.string().url().optional().nullable(),
        photoUrl: z.string().url().optional().nullable(),
        isPublic: z.boolean().optional(),
        testimonialDate: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, testimonialDate, ...rest } = input;
      const testimonial = await assertTestimonialOwner(
        ctx.db,
        ctx.session.user.id,
        id,
      );

      if (testimonial.source !== "owner") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only owner-created testimonials can be edited",
        });
      }

      return ctx.db.testimonial.update({
        where: { id },
        data: {
          ...rest,
          ...(testimonialDate && {
            testimonialDate: new Date(testimonialDate),
          }),
        },
      });
    }),

  // ─── ADMIN (BOTH TYPES) ───────────────────────────────────────────────────

  togglePublic: protectedProcedure
    .input(z.object({ id: z.string(), isPublic: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await assertTestimonialOwner(ctx.db, ctx.session.user.id, input.id);
      return ctx.db.testimonial.update({
        where: { id: input.id },
        data: { isPublic: input.isPublic },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertTestimonialOwner(ctx.db, ctx.session.user.id, input.id);
      return ctx.db.testimonial.delete({ where: { id: input.id } });
    }),

  sendInvite: protectedProcedure
    .input(
      z.object({
        businessId: z.string(),
        email: z.string().email(),
        customerId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwner(ctx.db, ctx.session.user.id, input.businessId);

      const business = await ctx.db.business.findUnique({
        where: { id: input.businessId },
        select: { name: true, subdomain: true },
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
          businessId: input.businessId,
          email: input.email,
          code,
          expiresAt,
          customerId: input.customerId,
        },
      });

      await sendTestimonialInviteEmail({
        to: input.email,
        businessName: business.name,
        inviteUrl: `https://${business.subdomain}.${process.env.NEXT_PUBLIC_PLATFORM_DOMAIN}/testimonials/submit?code=${code}`,
      });

      return invite;
    }),

  listInvites: protectedProcedure
    .input(z.object({ businessId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertOwner(ctx.db, ctx.session.user.id, input.businessId);
      return ctx.db.testimonialInvite.findMany({
        where: { businessId: input.businessId },
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { firstName: true, lastName: true } },
        },
      });
    }),
});
