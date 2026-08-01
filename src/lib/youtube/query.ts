// ─────────────────────────────────────────────────────────────────────────────
// YouTube videos — shared Prisma `where` fragments
// ─────────────────────────────────────────────────────────────────────────────
//
// Deliberately untyped against Prisma's generated namespace: this module is
// imported by storefront server components that sit next to client bundles, and
// keeping it free of any `generated/prisma` reference means it can never pull
// the client in by accident. The shapes are plain object literals that Prisma
// structurally accepts wherever a `VideoWhereInput` is expected.

/** Published videos for a business, scoped for storefront display. */
export function publishedVideoWhere(businessId: string) {
  return { businessId, published: true };
}
