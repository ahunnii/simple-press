import type { ProductVariant } from "generated/prisma";
import type { InputJsonValue } from "generated/prisma/runtime/library";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Get session
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { businessId, name, slug, description, price, published, variants } =
      (await req.json()) as {
        businessId: string;
        name: string;
        slug: string;
        description: string | null;
        price: number;
        published: boolean;
        variants: ProductVariant[];
      };

    // Verify user has access to this business
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { businessId: true },
    });

    if (user?.businessId !== businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify product exists and belongs to this business
    const existingProduct = await db.product.findFirst({
      where: {
        id,
        businessId,
      },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if slug is taken by another product
    if (slug !== existingProduct.slug) {
      const slugTaken = await db.product.findFirst({
        where: {
          businessId,
          slug,
          id: { not: id },
        },
      });

      if (slugTaken) {
        return NextResponse.json(
          { error: "A product with this slug already exists" },
          { status: 400 },
        );
      }
    }

    // Update product and variants in transaction
    const product = await db.$transaction(async (tx) => {
      // Update product
      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          name,
          slug,
          description,
          price,
          published,
        },
      });

      // Handle variants
      if (variants) {
        // Delete variants that were removed
        const variantIds = variants
          .filter((v: ProductVariant) => v.id)
          .map((v: ProductVariant) => v.id);
        await tx.productVariant.deleteMany({
          where: {
            productId: id,
            id: { notIn: variantIds },
          },
        });

        // Update or create variants
        for (const variant of variants) {
          if (variant.id) {
            // Update existing
            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                name: variant.name,
                sku: variant.sku ?? null,
                price: variant.price ?? null,
                inventoryQty: variant.inventoryQty || 0,
                options: variant.options as InputJsonValue,
              },
            });
          } else {
            // Create new
            await tx.productVariant.create({
              data: {
                productId: id,
                name: variant.name,
                sku: variant.sku ?? null,
                price: variant.price ?? null,
                inventoryQty: variant.inventoryQty || 0,
                options: variant.options as InputJsonValue,
              },
            });
          }
        }
      }

      // Fetch updated product with variants
      return await tx.product.findUnique({
        where: { id },
        include: { variants: true },
      });
    });

    return NextResponse.json({ success: true, product });
  } catch (error: unknown) {
    console.error("Update product error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update product",
      },
      { status: 500 },
    );
  }
}
