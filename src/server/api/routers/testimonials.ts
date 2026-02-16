import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { sendTestimonialInviteEmail } from "~/lib/email/templates";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const testimonialRouter = createTRPCRouter({
  // List testimonials (admin - all, public - only approved)
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
        orderBy: { createdAt: "desc" },
      });
    }),

  // Check if user can submit (not already submitted)
  canSubmit: protectedProcedure
    .input(
      z.object({
        businessId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true },
      });

      if (!user) return { canSubmit: false, reason: "User not found" };

      const existing = await ctx.db.testimonial.findUnique({
        where: {
          businessId_customerEmail: {
            businessId: input.businessId,
            customerEmail: user.email,
          },
        },
      });

      return {
        canSubmit: !existing,
        reason: existing
          ? "You have already submitted a testimonial"
          : undefined,
      };
    }),

  // Submit testimonial (authenticated users)
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

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not found",
        });
      }

      // Check if already submitted
      const existing = await ctx.db.testimonial.findUnique({
        where: {
          businessId_customerEmail: {
            businessId: input.businessId,
            customerEmail: user.email,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already submitted a testimonial",
        });
      }

      // Find or create customer
      const customer = await ctx.db.customer.upsert({
        where: {
          businessId_email: {
            businessId: input.businessId,
            email: user.email,
          },
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
          businessId: input.businessId,
          customerId: customer.id,
          customerEmail: user.email,
          customerName: user.name || user.email,
          rating: input.rating,
          text: input.text,
          videoUrl: input.videoUrl,
          photoUrl: input.photoUrl,
        },
      });
    }),

  // Submit via invite code (unauthenticated)
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
      // Find and validate invite
      const invite = await ctx.db.testimonialInvite.findUnique({
        where: { code: input.code },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid invite code",
        });
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

      // Check if already submitted
      const existing = await ctx.db.testimonial.findUnique({
        where: {
          businessId_customerEmail: {
            businessId: invite.businessId,
            customerEmail: invite.email,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A testimonial has already been submitted with this email",
        });
      }

      // Find or create customer
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

      // Create testimonial
      const testimonial = await ctx.db.testimonial.create({
        data: {
          businessId: invite.businessId,
          customerId: customer.id,
          customerEmail: invite.email,
          customerName: input.name,
          rating: input.rating,
          text: input.text,
          videoUrl: input.videoUrl,
          photoUrl: input.photoUrl,
        },
      });

      // Mark invite as used
      await ctx.db.testimonialInvite.update({
        where: { id: invite.id },
        data: {
          used: true,
          usedAt: new Date(),
        },
      });

      return testimonial;
    }),

  // Get invite by code (public)
  getInvite: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const invite = await ctx.db.testimonialInvite.findUnique({
        where: { code: input.code },
        include: {
          business: {
            select: {
              name: true,
              subdomain: true,
            },
          },
        },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found",
        });
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

  // Create invite and send email (admin)
  sendInvite: protectedProcedure
    .input(
      z.object({
        businessId: z.string(),
        email: z.string().email(),
        customerId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== input.businessId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      const business = await ctx.db.business.findUnique({
        where: { id: input.businessId },
        select: { name: true, subdomain: true },
      });

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      // Generate unique code
      const code = crypto.randomBytes(16).toString("hex");

      // Expires in 30 days
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

      // Send email
      await sendTestimonialInviteEmail({
        to: input.email,
        businessName: business.name,
        inviteUrl: `https://${business.subdomain}.${process.env.NEXT_PUBLIC_PLATFORM_DOMAIN}/testimonials/submit?code=${code}`,
      });

      return invite;
    }),

  // List invites (admin)
  listInvites: protectedProcedure
    .input(
      z.object({
        businessId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.testimonialInvite.findMany({
        where: { businessId: input.businessId },
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    }),

  // Toggle public status (admin)
  togglePublic: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        isPublic: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const testimonial = await ctx.db.testimonial.findUnique({
        where: { id: input.id },
        select: { businessId: true },
      });

      if (!testimonial) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Testimonial not found",
        });
      }

      // Verify ownership
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== testimonial.businessId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      return ctx.db.testimonial.update({
        where: { id: input.id },
        data: { isPublic: input.isPublic },
      });
    }),

  // Delete testimonial (admin)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const testimonial = await ctx.db.testimonial.findUnique({
        where: { id: input.id },
        select: { businessId: true },
      });

      if (!testimonial) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Testimonial not found",
        });
      }

      // Verify ownership
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== testimonial.businessId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      return ctx.db.testimonial.delete({
        where: { id: input.id },
      });
    }),
});
