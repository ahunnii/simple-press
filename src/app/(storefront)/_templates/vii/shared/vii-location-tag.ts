import { getRawCustomFieldString } from "~/lib/template-fields";

import { nonBlank } from "./vii-non-blank";

/**
 * The short location shown under the wordmark (header + footer), after the
 * story count in the blog masthead, and as the local-roots photo placeholder.
 *
 * Settings → General → address city wins. The legacy `vii.global.location-tag`
 * field (retired 2026-09-25) is a read-only fallback for a site that saved one
 * before the tag moved to Settings — never written or cleared from here, and
 * its old "Detroit" default is deliberately not applied. `undefined` = hide.
 */
export function resolveViiLocationTag(
  business: { addressCity?: string | null } | null | undefined,
  customFields: unknown,
): string | undefined {
  return (
    nonBlank(business?.addressCity) ??
    nonBlank(getRawCustomFieldString(customFields, "vii.global.location-tag"))
  );
}
