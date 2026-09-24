import { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import {
  InventoryMovementError,
  isRetryableLockError,
  rethrowMovementError,
  toTrpcError,
} from "./manual-movement";

const clientVersion = "6.test";

// Shapes captured from the test Postgres (Prisma 6) — see isRetryableLockError.
function rawQueryFailed(pgCode: string, pgMessage: string) {
  return new Prisma.PrismaClientKnownRequestError(
    `\nInvalid \`prisma.$queryRaw()\` invocation:\n\n\nRaw query failed. Code: \`${pgCode}\`. Message: \`ERROR: ${pgMessage}\``,
    {
      code: "P2010",
      clientVersion,
      meta: { code: pgCode, message: `ERROR: ${pgMessage}` },
    },
  );
}

describe("isRetryableLockError", () => {
  it("retries NOWAIT failures (P2010 / 55P03)", () => {
    expect(
      isRetryableLockError(
        rawQueryFailed(
          "55P03",
          'could not obtain lock on row in relation "BaseInventoryUnit"',
        ),
      ),
    ).toBe(true);
  });

  it("retries raw lock_timeout (P2010 / 55P03) and deadlocks (P2010 / 40P01)", () => {
    expect(
      isRetryableLockError(
        rawQueryFailed("55P03", "canceling statement due to lock timeout"),
      ),
    ).toBe(true);
    expect(
      isRetryableLockError(rawQueryFailed("40P01", "deadlock detected")),
    ).toBe(true);
  });

  it("retries an ORM query's lock_timeout (UnknownRequestError carrying PostgresError 55P03)", () => {
    const err = new Prisma.PrismaClientUnknownRequestError(
      '\nInvalid `tx.baseInventoryUnit.update()` invocation\nError occurred during query execution:\nConnectorError(ConnectorError { user_facing_error: None, kind: QueryError(PostgresError { code: "55P03", message: "canceling statement due to lock timeout", severity: "ERROR", detail: None, column: None, hint: None }), transient: false })',
      { clientVersion },
    );
    expect(isRetryableLockError(err)).toBe(true);
  });

  it("retries Prisma's P2034 write conflict / deadlock", () => {
    expect(
      isRetryableLockError(
        new Prisma.PrismaClientKnownRequestError("write conflict", {
          code: "P2034",
          clientVersion,
        }),
      ),
    ).toBe(true);
  });

  it("does not retry other errors", () => {
    expect(
      isRetryableLockError(rawQueryFailed("23505", "duplicate key value")),
    ).toBe(false);
    expect(
      isRetryableLockError(
        new Prisma.PrismaClientKnownRequestError("unique", {
          code: "P2002",
          clientVersion,
        }),
      ),
    ).toBe(false);
    expect(
      isRetryableLockError(
        new Prisma.PrismaClientUnknownRequestError(
          'PostgresError { code: "23503", message: "fk" }',
          { clientVersion },
        ),
      ),
    ).toBe(false);
    expect(isRetryableLockError(new InventoryMovementError("NOT_FOUND"))).toBe(
      false,
    );
    expect(isRetryableLockError(new Error("55P03"))).toBe(false);
    expect(isRetryableLockError(null)).toBe(false);
  });
});

describe("toTrpcError / rethrowMovementError", () => {
  it("maps each movement error code", () => {
    expect(toTrpcError(new InventoryMovementError("NOT_FOUND"))).toMatchObject({
      code: "NOT_FOUND",
      message: "Item not found",
    });
    expect(
      toTrpcError(
        new InventoryMovementError("EXPECTED_MISMATCH", undefined, {
          currentQty: 7,
        }),
      ),
    ).toMatchObject({
      code: "CONFLICT",
      message:
        "The count changed to 7 since you opened this — review and re-enter.",
    });
    expect(
      toTrpcError(
        new InventoryMovementError("INSUFFICIENT_AVAILABLE", undefined, {
          available: 2,
          itemName: "Chairs",
        }),
      ),
    ).toMatchObject({
      code: "BAD_REQUEST",
      message: "Only 2 available for Chairs",
    });
    expect(toTrpcError(new InventoryMovementError("NEGATIVE")).code).toBe(
      "BAD_REQUEST",
    );
    expect(
      toTrpcError(new InventoryMovementError("INVALID", "bad qty")),
    ).toMatchObject({ code: "BAD_REQUEST", message: "bad qty" });
  });

  it("rethrows non-movement errors untouched", () => {
    const other = new Error("boom");
    expect(() => rethrowMovementError(other)).toThrow(other);
    expect(() =>
      rethrowMovementError(new InventoryMovementError("NOT_FOUND")),
    ).toThrow(TRPCError);
  });
});
