import type { ProductVariant } from "generated/prisma";
import type { InputJsonValue } from "generated/prisma/runtime/library";
import { type NextRequest, NextResponse } from "next/server";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

export async function POST(req: NextRequest) {
  try {
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

    // Validation
    if (!name || !slug || !price) {
      return NextResponse.json(
        { error: "Name, slug, and price are required" },
        { status: 400 },
      );
    }

    // Verify user has access to this business
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { businessId: true },
    });

    if (user?.businessId !== businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if slug is already taken for this business
    const existingProduct = await db.product.findFirst({
      where: {
        businessId,
        slug,
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: "A product with this slug already exists" },
        { status: 400 },
      );
    }

    // Create product
    const product = await db.product.create({
      data: {
        businessId,
        name,
        slug,
        description,
        price,
        published: published || false,
        variants:
          variants && variants.length > 0
            ? {
                create: variants.map((v: ProductVariant) => ({
                  name: v.name,
                  sku: v.sku ?? null,
                  price: v.price ?? null,
                  inventoryQty: v.inventoryQty || 0,
                  options: v.options as InputJsonValue,
                })),
              }
            : undefined,
      },
      include: {
        variants: true,
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (error: unknown) {
    console.error("Create product error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create product",
      },
      { status: 500 },
    );
  }
}
