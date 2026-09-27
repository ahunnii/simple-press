import { getRawCustomFieldString } from "~/lib/template-fields";

function nonBlank(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed?.length ? trimmed : undefined;
}

/**
 * The short location shown in the footer's bottom bar next to the copyright
 * line.
 *
 * Settings → General → address city wins. The legacy
 * `sledge.global.location-tag` field (retired 2026-09-26) is a read-only
 * fallback for a site that saved one before the tag moved to Settings —
 * never written or cleared from here. `undefined` = hide.
 */
export function resolveSledgeLocationTag(
  business: { addressCity?: string | null } | null | undefined,
  customFields: unknown,
): string | undefined {
  return (
    nonBlank(business?.addressCity) ??
    nonBlank(
      getRawCustomFieldString(customFields, "sledge.global.location-tag"),
    )
  );
}
