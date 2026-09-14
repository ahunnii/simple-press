/**
 * True when `error` is a Prisma P2002 unique-constraint violation.
 * Shared so idempotent-insert paths (loyalty ledger, videos) treat a duplicate
 * as a no-op instead of a failure.
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}
