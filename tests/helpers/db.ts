import "./test-env";

import { db } from "~/server/db";

export { db };

/**
 * Truncate every tenant table between tests so each one starts from a clean,
 * isolated state. Dynamic table discovery avoids hardcoding the (large) model
 * list and keeps working as the schema grows.
 */
export async function resetDb(): Promise<void> {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
