import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const leaderRoleEnum = z.enum([
  "PRESIDENT",
  "VICE_PRESIDENT",
  "SECRETARY",
  "TREASURER",
  "MEMBER",
  "MODERATOR",
  "OWNER",
  "CHAIRMAN",
  "VICE_CHAIR",
  "CAPTAIN",
]);

const leaderInput = z.object({
  name: z.string().min(1),
  role: leaderRoleEnum,
  image: z.string().optional(),
});

const resourceInput = z.object({
  url: z.string().url(),
  name: z.string().min(1),
  type: z.string().optional(),
});

const galleryImageInput = z.object({
  url: z.string().url(),
  alt: z.string().min(1),
});

export const clubRouter = createTRPCRouter({
  get: publicProcedure.input(z.string()).query(async ({ ctx, input: slug }) => {
    const club = await ctx.db.club.findUnique({
      where: { slug },
      include: {
        _count: { select: { members: true } },
        events: {
          orderBy: {
            startTime: "asc",
          },
          take: 3,
        },
        leaders: true,
        gallery: true,
        resources: true,
      },
    });
    return club;
  }),

  getById: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const club = await ctx.db.club.findUnique({
        where: { id },
        include: {
          leaders: true,
          gallery: true,
          resources: true,
        },
      });
      return club;
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    const clubs = await ctx.db.club.findMany();
    return clubs;
  }),

  getAllForDisplay: publicProcedure.query(async ({ ctx }) => {
    const clubs = await ctx.db.club.findMany({
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
      include: {
        _count: { select: { members: true } },
      },
    });

    return clubs;
    // return clubs.map((club) => ({
    //   ...club,
    //   image: club.image
    //     ? `https://${env.NEXT_PUBLIC_STORAGE_URL}/${env.STORAGE_BUCKET_NAME}/${club.image}`
    //     : null,
    //   logo: club.logo
    //     ? `https://${env.NEXT_PUBLIC_STORAGE_URL}/${env.STORAGE_BUCKET_NAME}/${club.logo}`
    //     : null,
    // }));
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string(),
        description: z.string().optional(),
        image: z.string().optional(),
        logo: z.string().optional(),
        type: z.enum([
          "CLEAN_AND_GREEN",
          "SAFE_AND_SECURE",
          "SUPPORT_AND_CONNECTION",
          "OTHER",
        ]),
        isFeatured: z.boolean(),
        tagline: z.string().optional(),
        quickDescription: z.string().optional(),
        email: z.string().optional(),
        highlights: z.array(z.string()).optional(),
        leaders: z.array(leaderInput).optional(),
        resources: z.array(resourceInput).optional(),
        gallery: z.array(galleryImageInput).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const club = await ctx.db.club.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          image: input.image,
          logo: input.logo,
          type: input.type,
          isFeatured: input.isFeatured,
          tagline: input.tagline ?? null,
          quickDescription: input.quickDescription ?? null,
          email: input.email?.trim() ? input.email : null,
          highlights: input.highlights ?? [],
          leaders:
            (input.leaders?.length ?? 0) > 0
              ? {
                  create: input.leaders!.map((l) => ({
                    name: l.name,
                    role: l.role,
                    image: l.image ?? null,
                  })),
                }
              : undefined,
          resources:
            (input.resources?.length ?? 0) > 0
              ? {
                  create: input.resources!.map((r) => ({
                    url: r.url,
                    name: r.name,
                    type: r.type ?? null,
                  })),
                }
              : undefined,
          gallery:
            (input.gallery?.length ?? 0) > 0
              ? {
                  create: input.gallery!.map((g) => ({
                    url: g.url,
                    alt: g.alt,
                  })),
                }
              : undefined,
        },
      });
      return {
        data: club,
        message: "Club created successfully",
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        slug: z.string(),
        description: z.string().optional(),
        image: z.string().optional(),
        logo: z.string().optional(),
        type: z.enum([
          "CLEAN_AND_GREEN",
          "SAFE_AND_SECURE",
          "SUPPORT_AND_CONNECTION",
          "OTHER",
        ]),
        isFeatured: z.boolean(),
        tagline: z.string().optional(),
        quickDescription: z.string().optional(),
        email: z.string().optional(),
        highlights: z.array(z.string()).optional(),
        leaders: z.array(leaderInput).optional(),
        resources: z.array(resourceInput).optional(),
        gallery: z.array(galleryImageInput).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, leaders, resources, gallery, ...scalar } = input;
      await ctx.db.$transaction(async (tx) => {
        await tx.club.update({
          where: { id },
          data: {
            name: scalar.name,
            slug: scalar.slug,
            description: scalar.description ?? null,
            image: scalar.image ?? null,
            logo: scalar.logo ?? null,
            type: scalar.type,
            isFeatured: scalar.isFeatured,
            tagline: scalar.tagline ?? null,
            quickDescription: scalar.quickDescription ?? null,
            email: scalar.email?.trim() ? scalar.email : null,
            highlights: scalar.highlights ?? [],
          },
        });
        if (leaders !== undefined) {
          await tx.leader.deleteMany({ where: { clubId: id } });
          if (leaders.length > 0) {
            await tx.leader.createMany({
              data: leaders.map((l) => ({
                clubId: id,
                name: l.name,
                role: l.role,
                image: l.image ?? null,
              })),
            });
          }
        }
        if (resources !== undefined) {
          await tx.resource.deleteMany({ where: { clubId: id } });
          if (resources.length > 0) {
            await tx.resource.createMany({
              data: resources.map((r) => ({
                clubId: id,
                url: r.url,
                name: r.name,
                type: r.type ?? null,
              })),
            });
          }
        }
        if (gallery !== undefined) {
          await tx.image.deleteMany({ where: { clubId: id } });
          if (gallery.length > 0) {
            await tx.image.createMany({
              data: gallery.map((g) => ({
                clubId: id,
                url: g.url,
                alt: g.alt,
              })),
            });
          }
        }
      });
      const club = await ctx.db.club.findUnique({
        where: { id },
        include: { leaders: true, gallery: true, resources: true },
      });
      return {
        data: club,
        message: "Club updated successfully",
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.club.delete({
        where: { id: input.id },
      });
      return { message: "Club deleted successfully" };
    }),
});
