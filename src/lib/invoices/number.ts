/**
 * Invoice numbers — pure, client-safe.
 *
 * A native invoice stores its number as an integer (`Invoice.invoiceNumber`,
 * unique per business) plus a snapshot of the prefix in force when it was
 * created (`Invoice.numberPrefix`). The zero-padding width is NOT snapshotted —
 * it is a display preference read from `InvoiceSettings.numberPadding` — so
 * changing it re-renders every invoice consistently, while changing the prefix
 * never rewrites the number printed on an invoice a customer already has.
 */

/** Largest value a Postgres `Int4` column holds — the ceiling on a parsed number. */
const INT4_MAX = 2_147_483_647;

/**
 * `formatInvoiceNumber("INV-", 12, 4)` → `"INV-0012"`. A number wider than the
 * padding is printed in full (`padStart` never truncates), so 12345 with
 * padding 4 is `"INV-12345"`, not a collision with `"INV-2345"`.
 */
export function formatInvoiceNumber(
  prefix: string,
  invoiceNumber: number,
  padding: number,
): string {
  const width = Math.max(1, Math.floor(padding));
  return `${prefix}${String(invoiceNumber).padStart(width, "0")}`;
}

/**
 * Anything the list search box might contain that names an invoice by number:
 * `"INV-0012"`, `"inv-12"`, `"#12"`, `"12"`, `"2026-0012"` — i.e. an optional
 * short prefix of word-ish characters followed by the digits. The trailing
 * digit run IS the number, so a prefix may itself contain digits.
 */
const NUMBER_QUERY_PATTERN = /^[A-Za-z0-9#_./-]{0,16}?(\d{1,10})$/;

/**
 * The invoice number a search query refers to, or `null` when it doesn't look
 * like one. Used alongside — never instead of — the name/email match: the
 * router ORs `invoiceNumber = n` into the search, so `"a1"` harmlessly also
 * matches invoice #1.
 *
 * The prefix is deliberately NOT checked against the business's current
 * prefix: an invoice created under an old prefix must still be findable by the
 * number printed on it.
 */
export function parseInvoiceNumberQuery(query: string): number | null {
  const match = NUMBER_QUERY_PATTERN.exec(query.trim());
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isSafeInteger(n) || n < 1 || n > INT4_MAX) return null;
  return n;
}
