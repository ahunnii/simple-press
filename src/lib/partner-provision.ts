import { z } from "zod";

/**
 * Pure, dependency-free helpers for the Artisanal Futures partner-provisioning
 * route (`src/app/api/partner/provision/route.ts`). Kept in their own module so
 * they can be unit-tested in the node "unit" vitest project without pulling in
 * Prisma, S3, or env. The route file owns all the impure orchestration.
 *
 * Contract: docs/integrations/artisanal-futures-provisioning.md ("Shared
 * contract" + item B5).
 */

/** Request body for `POST /api/partner/provision`, per the shared contract. */
export const provisionRequestSchema = z.object({
  afProvisionCode: z.string().min(1),
  businessName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  logoUrl: z.string().url().startsWith("https://").optional(),
  templateId: z.string().optional(),
});

export type ProvisionRequest = z.infer<typeof provisionRequestSchema>;

/**
 * Allow-list mapping of image content-type → file extension (including the
 * leading dot) for logo ingestion. Anything not in this map aborts ingestion
 * (the request itself still succeeds with `logoIngested: false`).
 *
 * Parameters after `;` (e.g. `image/svg+xml; charset=utf-8`) are stripped, and
 * the type is compared case-insensitively.
 */
export function extFromContentType(contentType: string | null): string | null {
  if (!contentType) return null;
  const type = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  switch (type) {
    case "image/png":
      return ".png";
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/svg+xml":
      return ".svg";
    default:
      return null;
  }
}

/** True when the content-type is an image (`image/…`). */
export function isImageContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return (contentType.split(";")[0]?.trim().toLowerCase() ?? "").startsWith(
    "image/",
  );
}

/**
 * Resolve the effective template id: default to `"modern"`, and fall back to
 * `"modern"` for any id not in the free-template allow-list (unknown/paid
 * templates never error — they silently downgrade).
 *
 * @returns the effective id plus whether a fallback was applied (for logging).
 */
export function resolveTemplateId(
  requested: string | undefined,
  freeTemplateIds: readonly string[],
): { templateId: string; fellBack: boolean } {
  const DEFAULT = "modern";
  if (!requested) return { templateId: DEFAULT, fellBack: false };
  if (freeTemplateIds.includes(requested)) {
    return { templateId: requested, fellBack: false };
  }
  return { templateId: DEFAULT, fellBack: true };
}

export function buildStorefrontUrl(
  subdomain: string,
  platformDomain: string,
): string {
  return `https://${subdomain}.${platformDomain}`;
}

export function buildClaimUrl(platformBaseUrl: string, code: string): string {
  return `${platformBaseUrl.replace(/\/+$/, "")}/platform/claim/${code}`;
}
