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

  // Tracks slugs/SKUs already claimed during this import run so that two rows
  // in the same file (or a row colliding with one just created earlier in
  // this same run) don't both pass the DB uniqueness check and then race
  // each other into the unique constraint. Combined with the DB re-query in
  // the helpers below, this covers both in-run collisions and collisions
  // against products that already existed before the import started.
  const usedSlugs = new Set<string>();
  const usedSkus = new Set<string>();

  // Import simple products first
  for (const product of simpleProducts) {
    try {
      await importSingleProduct(
        product,
        options,
        collectionMap,
        usedSlugs,
        usedSkus,
      );
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
        usedSlugs,
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

/**
 * Finds a slug that is unique for the given business, appending -2, -3, ...
 * as needed. Checks the in-run `usedSlugs` set first (fast path for
 * duplicate names within the same import) and falls back to a DB query so
 * collisions against products that existed before this import are also
 * caught. Mirrors the pattern used for collections/services/galleries.
 */
async function getUniqueProductSlug(
  businessId: string,
  baseSlug: string,
  usedSlugs: Set<string>,
): Promise<string> {
  let counter = 1;
  let candidate = baseSlug;

  while (true) {
    if (counter > 1000) {
      throw new Error(`Could not generate a unique slug for "${baseSlug}".`);
    }

    if (!usedSlugs.has(candidate)) {
      const existing = await db.product.findFirst({
        where: { businessId, slug: candidate },
        select: { id: true },
      });

      if (!existing) {
        usedSlugs.add(candidate);
        return candidate;
      }

      usedSlugs.add(candidate);
    }

    counter++;
    candidate = `${baseSlug}-${counter}`;
  }
}

/**
 * Finds a SKU that is unique for the given business, for use by the
 * "create_new" duplicate-SKU strategy. Starts at -2 since the base SKU is
 * already known to collide with an existing product.
 */
async function getUniqueProductSku(
  businessId: string,
  baseSku: string,
  usedSkus: Set<string>,
): Promise<string> {
  let counter = 2;
  let candidate = `${baseSku}-${counter}`;

  while (true) {
    if (counter > 1000) {
      throw new Error(`Could not generate a unique SKU for "${baseSku}".`);
    }

    if (!usedSkus.has(candidate)) {
      const existing = await db.product.findFirst({
        where: { businessId, sku: candidate },
        select: { id: true },
      });

      if (!existing) {
        usedSkus.add(candidate);
        return candidate;
      }

      usedSkus.add(candidate);
    }

    counter++;
    candidate = `${baseSku}-${counter}`;
  }
}

async function importSingleProduct(
  product: ParsedProduct,
  options: ImportOptions,
  collectionMap: Map<string, string>,
  usedSlugs: Set<string>,
  usedSkus: Set<string>,
) {
  // The SKU actually written to the new product. Defaults to the CSV value;
  // reassigned below when onDuplicateSku === "create_new" needs a fresh,
  // non-colliding SKU instead of reusing the one that already collided.
  let skuToUse = product.sku;

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
      // If "create_new", continue to create a new product with a
      // freshly generated, guaranteed-unique SKU.
      skuToUse = await getUniqueProductSku(
        options.businessId,
        product.sku,
        usedSkus,
      );
    }
  }

  const baseSlug = slugify(product.name, { lower: true, strict: true });
  const slug = await getUniqueProductSlug(
    options.businessId,
    baseSlug,
    usedSlugs,
  );

  // Create product
  const createdProduct = await db.product.create({
    data: {
      businessId: options.businessId,
      name: product.name,
      slug,
      description: product.description,
      sku: skuToUse,
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
  usedSlugs: Set<string>,
) {
  const baseSlug = slugify(variableProduct.name, {
    lower: true,
    strict: true,
  });
  const slug = await getUniqueProductSlug(
    options.businessId,
    baseSlug,
    usedSlugs,
  );

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
        .map(([_, value]) => value)
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
