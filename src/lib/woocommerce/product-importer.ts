/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import slugify from "slugify";

import type { ParsedProduct } from "./csv-parser";
import { db } from "~/server/db";

export type ImportOptions = {
  businessId: string;
  onDuplicateSku: "skip" | "update" | "create_new";
  importImages: boolean;
  createCollectionsFromCategories: boolean;
};

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: Array<{ product: string; error: string }>;
};

export async function importProducts(
  products: ParsedProduct[],
  options: ImportOptions,
): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
  };

  // Group products by type
  const simpleProducts = products.filter((p) => p.type === "simple");
  const variableProducts = products.filter((p) => p.type === "variable");
  const variations = products.filter((p) => p.type === "variation");

  // Create collections from categories (optional)
  const collectionMap = new Map<string, string>();
  if (options.createCollectionsFromCategories) {
    const uniqueCategories = new Set(products.flatMap((p) => p.categories));

    for (const category of uniqueCategories) {
      try {
        const slug = slugify(category, { lower: true });

        const collection = await db.collection.upsert({
          where: {
            businessId_slug: {
              businessId: options.businessId,
              slug,
            },
          },
          create: {
            businessId: options.businessId,
            name: category,
            slug,
            published: true,
          },
          update: {},
        });

        collectionMap.set(category, collection.id);
      } catch (error) {
        console.error(`Failed to create collection: ${category}`, error);
      }
    }
  }

  // Import simple products first
  for (const product of simpleProducts) {
    try {
      await importSingleProduct(product, options, collectionMap);
      result.imported++;
    } catch (error) {
      result.errors.push({
        product: product.name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Import variable products with variations
  for (const variableProduct of variableProducts) {
    try {
      const productVariations = variations.filter(
        (v) => v.parentId === variableProduct.wooId,
      );

      await importVariableProduct(
        variableProduct,
        productVariations,
        options,
        collectionMap,
      );
      result.imported++;
    } catch (error) {
      result.errors.push({
        product: variableProduct.name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return result;
}

async function importSingleProduct(
  product: ParsedProduct,
  options: ImportOptions,
  collectionMap: Map<string, string>,
) {
  const slug = slugify(product.name, { lower: true, strict: true });

  // Check for duplicate SKU
  if (product.sku) {
    const existing = await db.product.findFirst({
      where: {
        businessId: options.businessId,
        sku: product.sku,
      },
    });

    if (existing) {
      if (options.onDuplicateSku === "skip") {
        return; // Skip this product
      } else if (options.onDuplicateSku === "update") {
        // Update existing product
        await db.product.update({
          where: { id: existing.id },
          data: {
            name: product.name,
            description: product.description,
            price: product.price,
            compareAtPrice: product.compareAtPrice,
            trackInventory: product.trackInventory,
            inventoryQty: product.inventoryQty,
            published: product.published,
            featured: product.featured,
            weight: product.weight,
          },
        });
        return;
      }
      // If "create_new", continue to create a new product
    }
  }

  // Create product
  const createdProduct = await db.product.create({
    data: {
      businessId: options.businessId,
      name: product.name,
      slug,
      description: product.description,
      sku: product.sku,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      trackInventory: product.trackInventory,
      inventoryQty: product.inventoryQty,
      published: product.published,
      featured: product.featured,
      weight: product.weight,
      weightUnit: "kg",
    },
  });

  // Import images
  if (options.importImages && product.images.length > 0) {
    await db.image.createMany({
      data: product.images.map((url, index) => ({
        productId: createdProduct.id,
        url,
        sortOrder: index,
      })),
    });
  }

  // Add to collections
  if (product.categories.length > 0) {
    const collectionProducts = product.categories
      .map((cat) => {
        const collectionId = collectionMap.get(cat);
        if (!collectionId) return null;

        return {
          collectionId,
          productId: createdProduct.id,
        };
      })
      .filter(Boolean) as Array<{ collectionId: string; productId: string }>;

    if (collectionProducts.length > 0) {
      await db.collectionProduct.createMany({
        data: collectionProducts,
        skipDuplicates: true,
      });
    }
  }
}

async function importVariableProduct(
  variableProduct: ParsedProduct,
  variations: ParsedProduct[],
  options: ImportOptions,
  collectionMap: Map<string, string>,
) {
  const slug = slugify(variableProduct.name, { lower: true, strict: true });

  // Use the lowest variant price as base price
  const lowestPrice =
    variations.length > 0
      ? Math.min(...variations.map((v) => v.price))
      : variableProduct.price;

  // Find if there's a compare at price
  const hasComparePrice = variations.some((v) => v.compareAtPrice);
  const lowestComparePrice = hasComparePrice
    ? Math.min(
        ...variations
          .filter((v) => v.compareAtPrice)
          .map((v) => v.compareAtPrice!),
      )
    : null;

  // Create base product
  const createdProduct = await db.product.create({
    data: {
      businessId: options.businessId,
      name: variableProduct.name,
      slug,
      description: variableProduct.description,
      sku: variableProduct.sku,
      price: lowestPrice,
      compareAtPrice: lowestComparePrice,
      trackInventory: variations.length > 0,
      inventoryQty: 0, // Tracked in variants
      published: variableProduct.published,
      featured: variableProduct.featured,
      weight: variableProduct.weight,
      weightUnit: "kg",
    },
  });

  // Import main product images
  if (options.importImages && variableProduct.images.length > 0) {
    await db.image.createMany({
      data: variableProduct.images.map((url, index) => ({
        productId: createdProduct.id,
        url,
        sortOrder: index,
      })),
    });
  }

  // Create variants with individual pricing
  for (const variation of variations) {
    // Build variant name from attributes
    const variantName =
      variation.variantName ??
      Object.entries(variation.attributes)
        .map(([key, value]) => value)
        .join(" / ");

    await db.productVariant.create({
      data: {
        productId: createdProduct.id,
        name: variantName,
        sku: variation.sku,
        price: variation.price, // Use variation's own price!
        compareAtPrice: variation.compareAtPrice,
        inventoryQty: variation.inventoryQty,
        imageUrl: variation.images[0] ?? null,
        options: variation.attributes, // Store attributes as JSON
      },
    });
  }

  // Add to collections
  if (variableProduct.categories.length > 0) {
    const collectionProducts = variableProduct.categories
      .map((cat) => {
        const collectionId = collectionMap.get(cat);
        if (!collectionId) return null;

        return {
          collectionId,
          productId: createdProduct.id,
        };
      })
      .filter(Boolean) as Array<{ collectionId: string; productId: string }>;

    if (collectionProducts.length > 0) {
      await db.collectionProduct.createMany({
        data: collectionProducts,
        skipDuplicates: true,
      });
    }
  }
}
