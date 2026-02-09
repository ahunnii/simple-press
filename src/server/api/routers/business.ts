import { headers } from "next/headers";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const businessRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z
        .object({
          productNumber: z.number().optional(),
          includeProducts: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const headersList = await headers();
      const hostname = headersList.get("host") ?? "";

      // Extract subdomain or custom domain
      const domain = hostname.split(":")[0]; // Remove port

      const business = await ctx.db.business.findFirst({
        where: {
          OR: [
            { customDomain: domain },
            { subdomain: domain?.split(".")[0] }, // Extract subdomain
          ],
          status: "active",
        },
        include: {
          siteContent: true,

          ...(input?.includeProducts
            ? {
                products: {
                  where: { published: true },
                  include: {
                    images: {
                      orderBy: { sortOrder: "asc" },
                      take: 1,
                    },
                  },
                  orderBy: { createdAt: "desc" },
                  ...(input?.productNumber
                    ? { take: input.productNumber }
                    : {}),
                },
              }
            : {}),
        },
      });
      return business;
    }),
});
