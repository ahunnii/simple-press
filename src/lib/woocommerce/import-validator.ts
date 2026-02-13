import type { ParsedProduct } from "./csv-parser";
import { db } from "~/server/db";

export type ValidationResult = {
  valid: ParsedProduct[];
  invalid: ParsedProduct[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    simpleProducts: number;
    variableProducts: number;
    variations: number;
    totalImages: number;
  };
};

export async function validateImport(
  businessId: string,
  products: ParsedProduct[],
): Promise<ValidationResult> {
  // Check for duplicate SKUs in import
  const skus = new Map<string, number>();
  products.forEach((p, index) => {
    if (p.sku) {
      if (skus.has(p.sku)) {
        p.errors.push(`Duplicate SKU in import (row ${skus.get(p.sku)})`);
        p.isValid = false;
      } else {
        skus.set(p.sku, index + 2); // +2 for 1-indexed + header row
      }
    }
  });

  // Check for duplicate SKUs in database
  const existingSkus = await db.product.findMany({
    where: {
      businessId,
      sku: { in: products.map((p) => p.sku).filter(Boolean) as string[] },
    },
    select: { sku: true },
  });

  const existingSkuSet = new Set(existingSkus.map((p) => p.sku));
  products.forEach((p) => {
    if (p.sku && existingSkuSet.has(p.sku)) {
      p.warnings.push(`SKU already exists in your store - will skip or update`);
    }
  });

  // Separate valid and invalid
  const valid = products.filter((p) => p.isValid);
  const invalid = products.filter((p) => !p.isValid);

  // Calculate summary
  const summary = {
    total: products.length,
    valid: valid.length,
    invalid: invalid.length,
    simpleProducts: products.filter((p) => p.type === "simple").length,
    variableProducts: products.filter((p) => p.type === "variable").length,
    variations: products.filter((p) => p.type === "variation").length,
    totalImages: products.reduce((sum, p) => sum + p.images.length, 0),
  };

  return {
    valid,
    invalid,
    summary,
  };
}
