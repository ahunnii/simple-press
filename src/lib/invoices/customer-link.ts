import "server-only";

import { TRPCError } from "@trpc/server";

import type { TxClient } from "~/server/db";
import { splitCustomerName } from "~/lib/customer-name";
import { normalizeEmail } from "~/lib/utils";

/**
 * Link an invoice to a `Customer` row, so it shows on the admin customer page
 * and in that customer's account Invoices tab.
 *
 * - **A picked customer (`customerId`)** is used as-is after checking it
 *   belongs to this business (NOT_FOUND otherwise — never link across
 *   tenants) and hasn't been anonymized. Its email is NOT rewritten to the
 *   one typed on the invoice: the owner picked this person explicitly, and a
 *   Customer's email is its identity (`@@unique([businessId, email])`).
 * - **Otherwise** the customer is upserted by `(businessId, normalized
 *   email)` — the same key checkout and the account pages use, so a person
 *   who later signs in with that email sees the invoice.
 *
 * Either way, first/last name are filled only when BOTH are empty: a name the
 * customer or owner already set is never overwritten by invoice typing.
 */
export async function upsertInvoiceCustomer(
  db: TxClient,
  businessId: string,
  input: { customerId?: string | null; name: string; email: string },
): Promise<string> {
  const names = splitCustomerName(input.name);

  if (input.customerId) {
    const existing = await db.customer.findFirst({
      where: { id: input.customerId, businessId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        anonymizedAt: true,
      },
    });
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
    }
    if (existing.anonymizedAt) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "This customer's data was erased — enter their details instead",
      });
    }
    if (!existing.firstName && !existing.lastName && names.firstName) {
      await db.customer.update({
        where: { id: existing.id },
        data: names,
      });
    }
    return existing.id;
  }

  const email = normalizeEmail(input.email);
  const customer = await db.customer.upsert({
    where: { businessId_email: { businessId, email } },
    create: {
      businessId,
      email,
      // Stores NULL, not "", for a missing half — see splitCustomerName.
      ...names,
    },
    update: {},
    select: { id: true, firstName: true, lastName: true },
  });

  if (!customer.firstName && !customer.lastName && names.firstName) {
    await db.customer.update({
      where: { id: customer.id },
      data: names,
    });
  }

  return customer.id;
}
