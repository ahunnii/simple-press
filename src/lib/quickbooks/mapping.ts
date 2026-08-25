import type {
  DepositRule,
  InvoiceKind,
  InvoiceStatus,
  QboInvoice,
  QboQueryResponse,
} from "~/lib/quickbooks/types";
import { QBO_MAX_ERROR_LENGTH } from "~/lib/quickbooks/constants";

/**
 * Pure QuickBooks Online (QBO) mapping/derivation logic — money math, status
 * derivation, request-body builders, and response-envelope helpers. No I/O,
 * no env vars, no server-only imports: everything here is unit-tested in
 * `mapping.test.ts` and safe to import from a client component.
 */

// ─── Deposit / prefill math ─────────────────────────────────────────────────

/**
 * The deposit invoice amount for a quote, given the owner's `DepositRule`
 * and the quote's total estimate (in cents, or `null` when the quote has no
 * priced estimate at all).
 *
 * - `percent` mode: `null` when `quoteCents` is `null` (nothing to take a
 *   percentage OF); otherwise `round(quoteCents * depositPercent / 100)`.
 * - `fixed` mode: `depositFixedCents`, clamped down to `quoteCents` when a
 *   quote amount is known — a fixed deposit can never exceed the quote it's
 *   a deposit against. With no quote amount to clamp against, the fixed
 *   amount is returned as-is.
 *
 * Never returns a negative number, regardless of what the rule/quote contain.
 */
export function computeDepositCents(
  rule: DepositRule,
  quoteCents: number | null,
): number | null {
  if (rule.depositMode === "percent") {
    if (quoteCents === null) return null;
    return Math.max(0, Math.round((quoteCents * rule.depositPercent) / 100));
  }

  const fixed = Math.max(0, rule.depositFixedCents);
  if (quoteCents === null) return fixed;
  return Math.min(fixed, Math.max(0, quoteCents));
}

/**
 * The pre-filled amount for a "final balance" invoice: the quote's final
 * price minus every deposit invoice actually counted against it.
 *
 * A deposit invoice counts unless its status is `error` (the QBO write never
 * succeeded), `voided` (cancelled), or `pending` (not yet created in QBO —
 * still reversible, nothing has been collected). `paid`, `sent`, `created`,
 * and `overdue` all count: the deposit was successfully invoiced, whether or
 * not it has been paid yet, because the owner is asking QBO to bill the
 * remainder regardless.
 *
 * `null` when `finalQuoteCents` is `null` (nothing to prefill against).
 * Floors at 0 — a final invoice is never prefilled negative even if prior
 * deposits summed past the quote (e.g. a manual custom invoice added on top).
 */
export function computeFinalPrefillCents(
  finalQuoteCents: number | null,
  priorInvoices: ReadonlyArray<{
    kind: string;
    status: string;
    amountCents: number;
  }>,
): number | null {
  if (finalQuoteCents === null) return null;

  const excludedDepositStatuses = new Set(["error", "voided", "pending"]);
  const depositedCents = priorInvoices
    .filter(
      (invoice) =>
        invoice.kind === "deposit" &&
        !excludedDepositStatuses.has(invoice.status),
    )
    .reduce((total, invoice) => total + invoice.amountCents, 0);

  return Math.max(0, finalQuoteCents - depositedCents);
}

// ─── Status derivation ───────────────────────────────────────────────────

/**
 * Derives the next local `InvoiceStatus` from a freshly-polled QBO invoice
 * and the status it had before this poll. Rules apply in order — the first
 * match wins:
 *
 * 1. `TotalAmt === 0` while we expected a non-zero total → `voided`. QBO
 *    represents "voided" by zeroing the invoice's line amounts rather than
 *    setting a distinct flag we can read here, so a total that dropped to
 *    zero against a positive expectation is the signal.
 * 2. `Balance <= 0` → `paid`. Takes priority over the overdue check below —
 *    a paid invoice is never reported overdue even if `DueDate` has passed.
 * 3. `DueDate` present and strictly before today (UTC calendar date) →
 *    `overdue`.
 * 4. Previously `created` and QBO reports `EmailStatus === "EmailSent"` →
 *    `sent`.
 * 5. Previously `overdue` but rule 3 no longer applies (e.g. the owner
 *    pushed the due date out in QBO) → `sent`. An invoice that stops being
 *    overdue is not un-overdue back to `created`/`pending` — it's simply no
 *    longer late, which reads as "still an open, sent invoice".
 * 6. Otherwise, the status is unchanged: `previous` is returned as-is.
 *    Notably `pending`, `error`, `voided`, and `paid` as `previous` are NOT
 *    specially advanced by any rule beyond 1–3 above — e.g. a `paid` invoice
 *    whose `Balance` later reappears (a partial refund) is governed by
 *    whichever of rules 1–3 matches at that point, not forced back to
 *    `paid` by virtue of having been paid before.
 */
export function deriveInvoiceStatus(
  qbo: Pick<QboInvoice, "TotalAmt" | "Balance" | "DueDate" | "EmailStatus">,
  ctx: { now: Date; previous: InvoiceStatus; expectedTotalCents: number },
): InvoiceStatus {
  if (
    typeof qbo.TotalAmt === "number" &&
    qbo.TotalAmt === 0 &&
    ctx.expectedTotalCents > 0
  ) {
    return "voided";
  }

  if (typeof qbo.Balance === "number" && qbo.Balance <= 0) {
    return "paid";
  }

  const todayUtc = ctx.now.toISOString().slice(0, 10);
  const isOverdue =
    typeof qbo.DueDate === "string" &&
    qbo.DueDate.length > 0 &&
    qbo.DueDate < todayUtc;
  if (isOverdue) {
    return "overdue";
  }

  if (ctx.previous === "created" && qbo.EmailStatus === "EmailSent") {
    return "sent";
  }

  if (ctx.previous === "overdue") {
    return "sent";
  }

  return ctx.previous;
}

// ─── Money ──────────────────────────────────────────────────────────────

/**
 * Cents → the decimal dollar amount QBO's API expects (e.g. `1999` → `19.99`).
 * Rounds to whole cents first, then to 2 decimal places, to avoid a stray
 * floating-point tail like `19.990000000000002` in the outgoing JSON.
 */
export function centsToQboAmount(cents: number): number {
  return Number((Math.round(cents) / 100).toFixed(2));
}

/**
 * The inverse of `centsToQboAmount` — a QBO decimal dollar amount → integer
 * cents. `null`/`undefined` pass through as `null` (QBO omits amount fields
 * it has nothing to report, e.g. `Balance` on a brand-new invoice read before
 * it's fully indexed).
 */
export function qboAmountToCents(
  amount: number | undefined | null,
): number | null {
  if (amount === undefined || amount === null) return null;
  return Math.round(amount * 100);
}

// ─── Query strings ──────────────────────────────────────────────────────

/**
 * Escapes a value for interpolation into a QBO SQL-like query string, where
 * values are single-quoted (e.g. `WHERE DisplayName = 'value'`). Backslash
 * must be escaped BEFORE the quote, or an input ending in a literal
 * backslash would consume the closing quote's own escape.
 */
export function escapeQboQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

// ─── Request body builders ──────────────────────────────────────────────

/** Request body for creating/updating a QBO `Customer`. */
export function buildCustomerPayload(input: {
  name: string;
  email: string;
  phone?: string | null;
}): object {
  return {
    DisplayName: input.name,
    PrimaryEmailAddr: { Address: input.email },
    ...(input.phone ? { PrimaryPhone: { FreeFormNumber: input.phone } } : {}),
  };
}

/** Request body for creating a QBO `Service` `Item` posting to the given income account. */
export function buildServiceItemPayload(
  name: string,
  incomeAccountId: string,
): object {
  return {
    Name: name,
    Type: "Service",
    IncomeAccountRef: { value: incomeAccountId },
  };
}

/**
 * Request body for creating a QBO `Invoice` — a single service line for the
 * full amount. `memo` and online-payment flags are only included when
 * applicable, since QBO treats an absent key differently from an empty one
 * for some of these fields.
 */
export function buildInvoicePayload(input: {
  customerId: string;
  itemId: string;
  amountCents: number;
  description: string;
  dueDate: string;
  email: string;
  memo?: string | null;
  allowOnlinePayment: boolean;
}): object {
  const amt = centsToQboAmount(input.amountCents);

  return {
    CustomerRef: { value: input.customerId },
    Line: [
      {
        Amount: amt,
        DetailType: "SalesItemLineDetail",
        Description: input.description,
        SalesItemLineDetail: {
          ItemRef: { value: input.itemId },
          Qty: 1,
          UnitPrice: amt,
        },
      },
    ],
    DueDate: input.dueDate,
    BillEmail: { Address: input.email },
    ...(input.memo ? { CustomerMemo: { value: input.memo } } : {}),
    ...(input.allowOnlinePayment
      ? { AllowOnlineCreditCardPayment: true, AllowOnlineACHPayment: true }
      : {}),
  };
}

/** The default invoice line description for an invoice kind, when the owner hasn't typed one. */
export function defaultLineDescription(
  kind: InvoiceKind,
  businessName: string,
): string {
  switch (kind) {
    case "deposit":
      return `Deposit — ${businessName}`;
    case "final":
      return `Final balance — ${businessName}`;
    case "custom":
      return `Services — ${businessName}`;
  }
}

// ─── Dates ──────────────────────────────────────────────────────────────

/**
 * A due date `dueDays` CALENDAR days after `now`'s date in the given IANA
 * `timeZone`, formatted `YYYY-MM-DD`.
 *
 * This is calendar-domain arithmetic, not instant arithmetic: `now` is first
 * resolved to a zone-local Y/M/D triple, and `dueDays` is added to `day`
 * directly (day/month/year rollover is handled by `Date.UTC`'s normalization
 * — no clock, no offset, no DST anywhere in that step). Because no instant
 * (millisecond) arithmetic happens after zoning, a DST transition between
 * `now` and the due date can NEVER shift the result by a day — a due date
 * requested the evening before a spring-forward is still exactly one
 * calendar day later, not two. (An earlier version of this function added
 * `dueDays * 86_400_000` ms to the instant BEFORE formatting, which broke
 * exactly this case — see `mapping.test.ts` for the regression.)
 *
 * The zone-local Y/M/D is never the UTC calendar date's — the two can differ
 * by a full day near midnight UTC (e.g. 2026-06-01T03:30Z is still
 * 2026-05-31 in `America/Detroit`). `en-CA` is used purely as a formatting
 * trick to extract that triple — that locale's date format IS `YYYY-MM-DD`,
 * so slicing the formatted string is enough; no `Intl.DateTimeFormatPart`
 * reassembly needed. `Date.UTC` in the second step is just a neutral,
 * DST-free scratch calendar for the `day + dueDays` addition — it does not
 * reinterpret the zoned Y/M/D as a UTC instant, and its result is read back
 * out with UTC getters (`toISOString().slice(0, 10)`), never zoned again.
 *
 * Throws `RangeError` for an invalid IANA `timeZone` — that's `Intl`'s own
 * behavior, not caught here, since a bad timezone string is a configuration
 * bug that should fail loudly.
 */
export function dueDateString(
  now: Date,
  dueDays: number,
  timeZone: string,
): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const zoned = formatter.format(now); // "YYYY-MM-DD" in `timeZone`
  const year = Number(zoned.slice(0, 4));
  const month = Number(zoned.slice(5, 7));
  const day = Number(zoned.slice(8, 10));

  const target = new Date(Date.UTC(year, month - 1, day + dueDays));
  return target.toISOString().slice(0, 10);
}

// ─── Misc ───────────────────────────────────────────────────────────────

/**
 * Truncates an error message to at most `max` characters, replacing the
 * final character with an ellipsis when truncation occurs so the result is
 * never mistaken for the complete message.
 */
export function truncateError(
  message: string,
  max: number = QBO_MAX_ERROR_LENGTH,
): string {
  if (message.length <= max) return message;
  if (max <= 1) return message.slice(0, max);
  return `${message.slice(0, max - 1)}…`;
}

/**
 * Extracts the rows for one entity from a QBO `/query` response, e.g.
 * `pickQueryRows(body, "Invoice")`. Returns `[]` — never `undefined` or a
 * thrown error — when the entity is absent (a query that matched nothing
 * omits the key entirely) or the response has no `QueryResponse` at all.
 */
export function pickQueryRows<T>(
  body: QboQueryResponse<T> | undefined,
  entity: string,
): T[] {
  const rows = body?.QueryResponse?.[entity];
  return Array.isArray(rows) ? rows : [];
}

/**
 * Extracts the single entity from a QBO create/read/update response, e.g.
 * `pickEntity<QboInvoice>(body, "Invoice")` for a body shaped like
 * `{ Invoice: {...}, time: "..." }`. Returns `null` when `body` isn't an
 * object or doesn't carry that key.
 */
export function pickEntity<T>(body: unknown, entity: string): T | null {
  if (typeof body !== "object" || body === null) return null;
  const value = (body as Record<string, unknown>)[entity];
  return value === undefined ? null : (value as T);
}

/** Splits `items` into consecutive chunks of at most `size`. The last chunk may be smaller. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0) {
    throw new RangeError("chunk size must be greater than 0");
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
