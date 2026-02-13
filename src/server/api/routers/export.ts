import { TRPCError } from "@trpc/server";
import z from "zod";

import {
  exportToWooCommerceCSV,
  generateExportFilename,
} from "~/lib/wordpress/csv-exporter";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildWxr(clubNames: string[]): string {
  const now = new Date();
  const pubDate = now.toUTCString();
  const wpDate = now.toISOString().replace("T", " ").slice(0, 19);

  const listItems = clubNames
    .map((name) => `<li>${escapeXml(name)}</li>`)
    .join("\n");

  const rawContent = `<h2>Our community clubs</h2>
<ul>
${listItems}
</ul>
<p>Don't see what you're looking for? Start your own club.</p>`;
  // CDATA must not contain "]]>" - split so it's not literal
  const content = rawContent.replace(/\]\]>/g, "]]]]><![CDATA[>");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wfw="http://wellformedweb.org/CommentAPI/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
  <title>Community Export</title>
  <link>https://example.com</link>
  <description>Community page export for WordPress</description>
  <pubDate>${pubDate}</pubDate>
  <language>en-US</language>
  <wp:wxr_version>1.2</wp:wxr_version>
  <item>
    <title>Community</title>
    <link>https://example.com/community/</link>
    <pubDate>${pubDate}</pubDate>
    <dc:creator><![CDATA[admin]]></dc:creator>
    <guid isPermaLink="false">https://example.com/?page_id=1</guid>
    <description></description>
    <content:encoded><![CDATA[${content}]]></content:encoded>
    <excerpt:encoded><![CDATA[]]></excerpt:encoded>
    <wp:post_id>1</wp:post_id>
    <wp:post_type>page</wp:post_type>
    <wp:post_date>${wpDate}</wp:post_date>
    <wp:post_date_gmt>${wpDate}</wp:post_date_gmt>
    <wp:status>publish</wp:status>
    <wp:post_name>community</wp:post_name>
  </item>
</channel>
</rss>
`;
}

export const exportRouter = createTRPCRouter({
  // wordpressCommunityWxr: protectedProcedure.query(async ({ ctx }) => {
  //   const clubs = await ctx.db.club.findMany({
  //     orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
  //     select: { name: true },
  //   });
  //   const clubNames = clubs.map((c) => c.name);
  //   const xml = buildWxr(clubNames);
  //   return { xml };
  // }),

  // Get products available for export
  getProductsForExport: protectedProcedure
    .input(
      z.object({
        businessId: z.string(),
        search: z.string().optional(),
        publishedOnly: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
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

      const products = await ctx.db.product.findMany({
        where: {
          businessId: input.businessId,
          ...(input.search && {
            OR: [
              { name: { contains: input.search, mode: "insensitive" } },
              { sku: { contains: input.search, mode: "insensitive" } },
            ],
          }),
          ...(input.publishedOnly && { published: true }),
        },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          published: true,
          featured: true,
          inventoryQty: true,
          images: {
            take: 1,
            orderBy: { sortOrder: "asc" },
          },
          variants: {
            select: { id: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return products.map((p) => ({
        ...p,
        variantCount: p.variants.length,
      }));
    }),

  // Export selected products
  exportProducts: protectedProcedure
    .input(
      z.object({
        businessId: z.string(),
        productIds: z.array(z.string()).min(1, "Select at least one product"),
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

      // Get products with all relations
      const products = await ctx.db.product.findMany({
        where: {
          id: { in: input.productIds },
          businessId: input.businessId,
        },
        include: {
          images: {
            orderBy: { sortOrder: "asc" },
          },
          variants: true,
        },
      });

      if (products.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No products found",
        });
      }

      // Generate CSV
      const csv = exportToWooCommerceCSV(products);

      // Get business name for filename
      const business = await ctx.db.business.findUnique({
        where: { id: input.businessId },
        select: { name: true },
      });

      const filename = generateExportFilename(business?.name ?? "products");

      return {
        csv,
        filename,
        productCount: products.length,
      };
    }),
});
