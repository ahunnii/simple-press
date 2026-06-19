import { fieldEncryptionExtension } from "prisma-field-encryption";

import { env } from "~/env";

import { Prisma, PrismaClient } from "../../generated/prisma";

const createPrismaClient = () =>
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  }).$extends(
    fieldEncryptionExtension({
      encryptionKey: env.PRISMA_FIELD_ENCRYPTION_KEY,
      // Required: pass DMMF from the custom generated client path so the
      // extension doesn't attempt to import from @prisma/client/default.
      dmmf: Prisma.dmmf,
    }),
  );

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * The type of the extended Prisma client (PrismaClient + fieldEncryptionExtension).
 * Use this instead of `PrismaClient` when typing `db` parameters in helpers.
 */
export type DbClient = typeof db;

/**
 * The transaction client type produced by db.$transaction().
 * Equivalent to Omit<DbClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">.
 */
export type TxClient = Omit<
  DbClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;
