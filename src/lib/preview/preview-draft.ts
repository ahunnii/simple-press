/**
 * True when a `SiteContent.previewCustomFields` value is a REAL visual-editor
 * draft that should be swapped over the live `customFields`.
 *
 * Treats SQL NULL, JSON null, non-objects, arrays, AND the empty object `{}`
 * as "no draft". The empty-object case is load-bearing: in dev, Turbopack HMR
 * can re-instantiate the generated Prisma module for a hot-updated router
 * chunk while the PrismaClient cached on `globalThis` (src/server/db.ts) still
 * holds the original module's sentinel classes. A `Prisma.JsonNull` from the
 * fresh copy fails the old client's identity check and gets serialized as a
 * plain `{}` — so the publish/discard "clear draft" writes `{}` instead of
 * JSON null, and a naive `!= null` swap guard then previews an empty draft
 * (every field falls back to its template default). An empty object is also
 * semantically meaningless as a draft — the editor's flush always persists the
 * full working set — so ignoring it is correct regardless of how it got there.
 *
 * Kept dependency-free (no server imports) so it stays unit-testable.
 */
export function isPreviewDraft(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}
