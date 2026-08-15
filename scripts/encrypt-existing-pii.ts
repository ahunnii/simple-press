/**
 * encrypt-existing-pii.ts
 *
 * One-time data migration: encrypts all existing plaintext PII values in
 * Customer.{phone,notes},
 * ShippingAddress.{firstName,lastName,company,address1,address2,city,province,zip,phone},
 * Order.{customerPhone,customerNote,internalNote}, and
 * QuoteSubmission.{contactName,contactEmail,contactPhone,sentMessage}
 * by writing each row's current values back through the Prisma client
 * (which has the fieldEncryptionExtension active).
 *
 * The extension is idempotent: values that are already encrypted ciphertext
 * (starting with "v1.") are passed through unchanged on write, so re-running
 * this script after a successful apply will update 0 rows.
 *
 * Idempotency detection: We use $queryRaw to read the raw column value directly
 * from Postgres (bypassing the extension's decryption). Any row whose stored
 * value already starts with "v1." is already encrypted and is skipped to avoid
 * unnecessary round-trips. Rows with NULL in every in-scope field are also skipped.
 *
 * Usage:
 *   pnpm tsx scripts/encrypt-existing-pii.ts          # dry-run (safe, read-only)
 *   pnpm tsx scripts/encrypt-existing-pii.ts --apply  # write changes
 *   APPLY=1 pnpm tsx scripts/encrypt-existing-pii.ts  # same as --apply
 */

import { fieldEncryptionExtension } from "prisma-field-encryption";

import { Prisma, PrismaClient } from "../generated/prisma";

// ---------------------------------------------------------------------------
// Bootstrap: we need the encryption key before env validation runs, so we
// load it directly from process.env after dotenv (tsx/ts-node loads .env
// automatically via the dotenv integration). The key is required at runtime.
// ---------------------------------------------------------------------------

const encryptionKey = process.env.PRISMA_FIELD_ENCRYPTION_KEY;
if (!encryptionKey) {
  console.error("ERROR: PRISMA_FIELD_ENCRYPTION_KEY is not set. Aborting.");
  process.exit(1);
}

const base = new PrismaClient({ log: ["error"] });
const db = base.$extends(
  fieldEncryptionExtension({
    encryptionKey,
    // Required: pass DMMF from the custom generated client path so the
    // extension doesn't attempt to import from @prisma/client/default.
    dmmf: Prisma.dmmf,
  }),
);

const DRY_RUN =
  !process.argv.includes("--apply") && process.env["APPLY"] !== "1";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the raw string value is already encrypted ciphertext.
 * prisma-field-encryption stores values as "v1.aesgcm256.<nonce>.<ciphertext>".
 * (The key name prefix is "k1." but stored ciphertext uses "v1." as its
 * version tag.)
 */
function isEncrypted(value: string | null): boolean {
  return value !== null && value.startsWith("v1.");
}

// ---------------------------------------------------------------------------
// Per-model encryption routines
// ---------------------------------------------------------------------------

async function encryptCustomers(): Promise<{
  scanned: number;
  updated: number;
  skipped: number;
}> {
  // Fetch raw encrypted-field values directly (bypasses extension decryption).
  const rows = await base.$queryRaw<
    { id: string; phone: string | null; notes: string | null }[]
  >`
    SELECT id, phone, notes FROM "Customer"
  `;

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    // Skip if all in-scope fields are either null or already encrypted.
    const fieldsToCheck = [row.phone, row.notes].filter(
      (v) => v !== null,
    ) as string[];

    if (fieldsToCheck.length === 0 || fieldsToCheck.every(isEncrypted)) {
      skipped++;
      continue;
    }

    console.log(`  [Customer] id=${row.id} — needs encryption`);

    if (!DRY_RUN) {
      // Read the decrypted values via the ORM (extension decrypts on read).
      const customer = await db.customer.findUnique({
        where: { id: row.id },
        select: { phone: true, notes: true },
      });
      if (!customer) {
        console.warn(`  [Customer] id=${row.id} — not found, skipping`);
        skipped++;
        continue;
      }
      await db.customer.update({
        where: { id: row.id },
        data: { phone: customer.phone, notes: customer.notes },
      });
    }
    updated++;
  }

  return { scanned: rows.length, updated, skipped };
}

async function encryptShippingAddresses(): Promise<{
  scanned: number;
  updated: number;
  skipped: number;
}> {
  // Fetch raw encrypted-field values directly.
  const rows = await base.$queryRaw<
    {
      id: string;
      first_name: string;
      last_name: string;
      company: string | null;
      address1: string;
      address2: string | null;
      city: string;
      province: string | null;
      zip: string;
      phone: string | null;
    }[]
  >`
    SELECT id, "firstName" AS first_name, "lastName" AS last_name,
           company, address1, address2, city, province, zip, phone
    FROM "ShippingAddress"
  `;

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    // Skip if all in-scope fields are either null or already encrypted.
    const fieldsToCheck = [
      row.first_name,
      row.last_name,
      row.company,
      row.address1,
      row.address2,
      row.city,
      row.province,
      row.zip,
      row.phone,
    ].filter((v) => v !== null) as string[];

    if (fieldsToCheck.length === 0 || fieldsToCheck.every(isEncrypted)) {
      skipped++;
      continue;
    }

    console.log(`  [ShippingAddress] id=${row.id} — needs encryption`);

    if (!DRY_RUN) {
      // Read via ORM (extension decrypts) so we pass plaintext back in.
      const addr = await db.shippingAddress.findUnique({
        where: { id: row.id },
        select: {
          firstName: true,
          lastName: true,
          company: true,
          address1: true,
          address2: true,
          city: true,
          province: true,
          zip: true,
          phone: true,
        },
      });
      if (!addr) {
        console.warn(`  [ShippingAddress] id=${row.id} — not found, skipping`);
        skipped++;
        continue;
      }
      await db.shippingAddress.update({
        where: { id: row.id },
        data: {
          firstName: addr.firstName,
          lastName: addr.lastName,
          company: addr.company,
          address1: addr.address1,
          address2: addr.address2,
          city: addr.city,
          province: addr.province,
          zip: addr.zip,
          phone: addr.phone,
        },
      });
    }
    updated++;
  }

  return { scanned: rows.length, updated, skipped };
}

async function encryptOrders(): Promise<{
  scanned: number;
  updated: number;
  skipped: number;
}> {
  const rows = await base.$queryRaw<
    {
      id: string;
      customer_phone: string | null;
      customer_note: string | null;
      internal_note: string | null;
    }[]
  >`
    SELECT id, "customerPhone" AS customer_phone,
           "customerNote" AS customer_note, "internalNote" AS internal_note
    FROM "Order"
  `;

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    // Skip if all in-scope fields are either null or already encrypted.
    const fieldsToCheck = [
      row.customer_phone,
      row.customer_note,
      row.internal_note,
    ].filter((v) => v !== null) as string[];

    if (fieldsToCheck.length === 0 || fieldsToCheck.every(isEncrypted)) {
      skipped++;
      continue;
    }

    console.log(`  [Order] id=${row.id} — needs encryption`);

    if (!DRY_RUN) {
      const order = await db.order.findUnique({
        where: { id: row.id },
        select: { customerPhone: true, customerNote: true, internalNote: true },
      });
      if (!order) {
        console.warn(`  [Order] id=${row.id} — not found, skipping`);
        skipped++;
        continue;
      }
      await db.order.update({
        where: { id: row.id },
        data: {
          customerPhone: order.customerPhone,
          customerNote: order.customerNote,
          internalNote: order.internalNote,
        },
      });
    }
    updated++;
  }

  return { scanned: rows.length, updated, skipped };
}

async function encryptQuoteSubmissions(): Promise<{
  scanned: number;
  updated: number;
  skipped: number;
}> {
  const rows = await base.$queryRaw<
    {
      id: string;
      contact_name: string;
      contact_email: string;
      contact_phone: string | null;
      sent_message: string | null;
    }[]
  >`
    SELECT id, "contactName" AS contact_name, "contactEmail" AS contact_email,
           "contactPhone" AS contact_phone, "sentMessage" AS sent_message
    FROM "QuoteSubmission"
  `;

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    // Skip if all in-scope fields are either null or already encrypted.
    const fieldsToCheck = [
      row.contact_name,
      row.contact_email,
      row.contact_phone,
      row.sent_message,
    ].filter((v) => v !== null) as string[];

    if (fieldsToCheck.length === 0 || fieldsToCheck.every(isEncrypted)) {
      skipped++;
      continue;
    }

    console.log(`  [QuoteSubmission] id=${row.id} — needs encryption`);

    if (!DRY_RUN) {
      // Read via ORM (extension decrypts) so we pass plaintext back in.
      const submission = await db.quoteSubmission.findUnique({
        where: { id: row.id },
        select: {
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          sentMessage: true,
        },
      });
      if (!submission) {
        console.warn(`  [QuoteSubmission] id=${row.id} — not found, skipping`);
        skipped++;
        continue;
      }
      await db.quoteSubmission.update({
        where: { id: row.id },
        data: {
          contactName: submission.contactName,
          contactEmail: submission.contactEmail,
          contactPhone: submission.contactPhone,
          sentMessage: submission.sentMessage,
        },
      });
    }
    updated++;
  }

  return { scanned: rows.length, updated, skipped };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (DRY_RUN) {
    console.log("=== DRY RUN (pass --apply to write changes) ===\n");
  } else {
    console.log("=== APPLY MODE — writing changes ===\n");
  }

  console.log("--- Customer encrypted fields ---");
  const customerStats = await encryptCustomers();

  console.log("\n--- ShippingAddress encrypted fields ---");
  const addressStats = await encryptShippingAddresses();

  console.log("\n--- Order encrypted fields ---");
  const orderStats = await encryptOrders();

  console.log("\n--- QuoteSubmission encrypted fields ---");
  const quoteStats = await encryptQuoteSubmissions();

  console.log("\n=== Summary ===");
  console.log(
    `Customer       — scanned: ${customerStats.scanned}, updated: ${customerStats.updated}, skipped (null/already encrypted): ${customerStats.skipped}`,
  );
  console.log(
    `ShippingAddress— scanned: ${addressStats.scanned}, updated: ${addressStats.updated}, skipped (null/already encrypted): ${addressStats.skipped}`,
  );
  console.log(
    `Order          — scanned: ${orderStats.scanned}, updated: ${orderStats.updated}, skipped (null/already encrypted): ${orderStats.skipped}`,
  );
  console.log(
    `QuoteSubmission— scanned: ${quoteStats.scanned}, updated: ${quoteStats.updated}, skipped (null/already encrypted): ${quoteStats.skipped}`,
  );

  const totalUpdated =
    customerStats.updated +
    addressStats.updated +
    orderStats.updated +
    quoteStats.updated;

  if (DRY_RUN) {
    console.log(
      `\n[DRY RUN] ${totalUpdated} row(s) would be updated. Re-run with --apply to apply.\n`,
    );
  } else {
    console.log(`\n[APPLY] ${totalUpdated} row(s) updated successfully.\n`);
  }
}

main()
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  })
  .finally(() => base.$disconnect());
