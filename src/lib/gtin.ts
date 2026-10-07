import { z } from "zod";

/**
 * Strips spaces and hyphens from a GTIN string.
 */
export function normalizeGtin(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

/**
 * Validates a GTIN using GS1 mod-10 check digit algorithm.
 * Accepts GTIN-8, UPC-A (12), EAN-13, and GTIN-14.
 */
export function isValidGtin(raw: string | null | undefined): boolean {
  if (!raw) return false;

  const normalized = normalizeGtin(raw);

  // Must be digits only
  if (!/^\d+$/.test(normalized)) return false;

  // Valid lengths: 8, 12, 13, 14
  const len = normalized.length;
  if (![8, 12, 13, 14].includes(len)) return false;

  // Reject all zeros
  if (/^0+$/.test(normalized)) return false;

  // GS1 mod-10: weights 3,1,3,… starting from the digit left of the check digit.
  const digits = Array.from(normalized, Number);
  const checkDigit = digits[len - 1];
  let sum = 0;
  for (let i = len - 2, weight = 3; i >= 0; i--, weight = 4 - weight) {
    sum += (digits[i] ?? 0) * weight;
  }

  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  return calculatedCheckDigit === checkDigit;
}

/**
 * Zod schema for GTIN field validation.
 * Accepts optional string; empty string allowed (means "none").
 */
export const gtinFieldSchema = z
  .string()
  .trim()
  .optional()
  .transform((val) => (val === "" ? undefined : val))
  .refine(
    (val) => val === undefined || isValidGtin(val),
    "Enter a valid 8, 12, 13 or 14-digit barcode (UPC/EAN/GTIN)",
  );
