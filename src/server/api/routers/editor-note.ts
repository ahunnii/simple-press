import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { notifyDiscordEditorNote } from "~/lib/discord/notification";
import { MAX_NOTE_ATTACHMENTS } from "~/lib/editor-notes";
import { editorNoteAttachmentPrefix } from "~/lib/s3/url";
import {
  createTRPCRouter,
  ownerAdminProcedure,
  platformAdminProcedure,
} from "~/server/api/trpc";

export const editorNoteRouter = createTRPCRouter({
  create: ownerAdminProcedure
    .input(
      z.object({
        body: z.string().trim().min(1).max(2000),
        pageKey: z.string().max(160).nullable(),
        pageLabel: z.string().max(200).nullable(),
        sectionKey: z.string().max(160).nullable().default(null),
        sectionLabel: z.string().max(200).nullable().default(null),
        attachmentUrls: z
          .array(z.string().url())
          .max(MAX_NOTE_ATTACHMENTS)
          .default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // A section is always "a section on a page" (site-wide chrome carries the
      // page the owner was on), so a section without a page is malformed.
      if (input.sectionKey && !input.pageKey) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A section note must also specify its page.",
        });
      }

      // Attachments must be objects the editorNoteImages route stored under
      // THIS business — never arbitrary or cross-tenant URLs.
      // The remainder must be exactly the route's `{16 hex}{ext}` filename, which
      // also rules out `..` / query / fragment tricks riding on the prefix.
      const attachmentPrefix = editorNoteAttachmentPrefix(businessId);
      const isOwnAttachment = (url: string) =>
        url.startsWith(attachmentPrefix) &&
        /^[0-9a-f]{16}\.[a-z0-9]{2,5}$/i.test(
          url.slice(attachmentPrefix.length),
        );
      if (!input.attachmentUrls.every(isOwnAttachment)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid attachment.",
        });
      }
      const attachmentUrls = [...new Set(input.attachmentUrls)];

      // Abuse guard: cap notes to 10/hour per business.
      const recentCount = await ctx.db.editorNote.count({
        where: {
          businessId,
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      });

      if (recentCount >= 10) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "You're sending notes too quickly — please try again in a little while.",
        });
      }

      const note = await ctx.db.editorNote.create({
        data: {
          businessId,
          pageKey: input.pageKey,
          pageLabel: input.pageLabel,
          sectionKey: input.sectionKey,
          sectionLabel: input.sectionLabel,
          attachmentUrls,
          body: input.body,
          createdByUserId: ctx.session.user.id,
        },
      });

      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: { name: true, subdomain: true },
      });

      if (business) {
        try {
          await notifyDiscordEditorNote({
            businessName: business.name,
            subdomain: business.subdomain,
            authorEmail: ctx.session.user.email,
            pageLabel: input.pageLabel,
            sectionLabel: input.sectionLabel,
            attachmentUrls,
            body: input.body,
          });
        } catch (err) {
          Sentry.captureException(err, {
            tags: { service: "discord", "trpc.procedure": "editorNote.create" },
          });
        }
      }

      return note;
    }),

  listMine: ownerAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.editorNote.findMany({
      where: { businessId: ctx.businessId },
      select: {
        id: true,
        pageKey: true,
        pageLabel: true,
        sectionKey: true,
        sectionLabel: true,
        attachmentUrls: true,
        body: true,
        status: true,
        response: true,
        createdAt: true,
        resolvedAt: true,
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
  }),

  platformList: platformAdminProcedure
    .input(
      z.object({
        status: z.enum(["open", "resolved", "all"]).default("open"),
        search: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { status, search, limit, offset } = input;

      const where = {
        ...(status === "all" ? {} : { status }),
        ...(search
          ? {
              business: {
                name: { contains: search, mode: "insensitive" as const },
              },
            }
          : {}),
      };

      const [notes, total] = await Promise.all([
        ctx.db.editorNote.findMany({
          where,
          include: {
            business: {
              select: { id: true, name: true, subdomain: true },
            },
            createdBy: {
              select: { email: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        ctx.db.editorNote.count({ where }),
      ]);

      return {
        notes,
        total,
        hasMore: offset + notes.length < total,
      };
    }),

  resolve: platformAdminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        response: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.editorNote.findUnique({
        where: { id: input.id },
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      }

      return ctx.db.editorNote.update({
        where: { id: input.id },
        data: {
          status: "resolved",
          resolvedAt: new Date(),
          response: input.response?.length ? input.response : null,
        },
      });
    }),
});
