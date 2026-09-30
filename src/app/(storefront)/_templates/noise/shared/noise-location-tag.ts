import { getRawCustomFieldString } from "~/lib/template-fields";

import { nonBlank } from "./noise-non-blank";

/**
 * The short location shown under the wordmark (header + footer) and in the
 * homepage hero credit strip / intro overlay.
 *
 * Settings → General → address city wins. The legacy `noise.global.location-tag`
 * field (retired 2026-09-25) is a read-only fallback for a site that saved one
 * before the tag moved to Settings — never written or cleared from here.
 * `undefined` = hide.
 */
export function resolveNoiseLocationTag(
  business: { addressCity?: string | null } | null | undefined,
  customFields: unknown,
): string | undefined {
  return (
    nonBlank(business?.addressCity) ??
    nonBlank(getRawCustomFieldString(customFields, "noise.global.location-tag"))
  );
}
