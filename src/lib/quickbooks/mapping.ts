import type {
  BillingAddress,
  DepositRule,
  InvoiceKind,
  InvoiceStatus,
  QboAddress,
  QboInvoice,
  QboQueryResponse,
} from "~/lib/quickbooks/types";
import { addCalendarDays, zonedCalendarDate } from "~/lib/calendar-date";
import { QBO_MAX_ERROR_LENGTH } from "~/lib/quickbooks/constants";

/**
 * Pure QuickBooks Online (QBO) mapping/derivation logic — money math, status
 * derivation, request-body builders, and response-envelope helpers. No I/O,
 * no env vars, no server-only imports: everything here is unit-tested in
 * `mapping.test.ts` and safe to import from a client component.
 */

// ─── Deposit / prefill math ─────────────────────────────────────────────────

/**
 * Invoice statuses that do NOT count as a live invoice: `pending` never
 * reached QuickBooks, `error` failed on the way there, and `voided` was
 * cancelled afterwards. Every other status (`created`, `sent`, `overdue`,
 * `paid`) is a real bill sitting in the customer's QuickBooks, whether or not
 * any money has moved yet.
 *
 * Deliberately ONE const shared by `computeFinalPrefillCents` and
 * `summarizeLeadBilling` (and importable by the admin UI, which used to keep
 * its own copy): "already deducted from the final balance" and "shown as
 * invoiced in the billing summary" must never be able to disagree, or the
 * owner reads one number on the lead card while QuickBooks bills another.
 */
export const QBO_DEAD_INVOICE_STATUSES: readonly InvoiceStatus[] = [
  "error",
  "voided",
  "pending",
];

/**
 * Whether an invoice row is a bill that actually exists in QBO — the inverse
 * of `QBO_DEAD_INVOICE_STATUSES`.
 *
 * Takes a plain `string`, not `InvoiceStatus`, because
 * `QuickBooksInvoice.status` is a Prisma `String` column with no enum behind
 * it: every caller (routers, cron, admin UI) holds the raw column value.
 */
export function isLiveInvoiceStatus(status: string): boolean {
  return !QBO_DEAD_INVOICE_STATUSES.some((dead) => dead === status);
}

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
 * still reversible, nothing has been collected) — i.e. unless it is one of
 * `QBO_DEAD_INVOICE_STATUSES`. `paid`, `sent`, `created`, and `overdue` all
 * count: the deposit was successfully invoiced, whether or not it has been
 * paid yet, because the owner is asking QBO to bill the remainder regardless.
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

  const depositedCents = priorInvoices
    .filter(
      (invoice) =>
        invoice.kind === "deposit" && isLiveInvoiceStatus(invoice.status),
    )
    .reduce((total, invoice) => total + invoice.amountCents, 0);

  return Math.max(0, finalQuoteCents - depositedCents);
}

// ─── Deposit presets ────────────────────────────────────────────────────────

/**
 * The percentages offered as one-tap deposit choices in the admin UI. The
 * owner's saved `DepositRule` still decides which one is PRE-selected (see
 * `presetForRule`) — these are the alternatives they can switch to on a
 * single lead without doing the arithmetic themselves or editing the rule.
 */
export const DEPOSIT_PRESET_PERCENTS = [25, 50, 75] as const;

export type DepositPresetPercent = (typeof DEPOSIT_PRESET_PERCENTS)[number];

/** A deposit choice in the UI: one of the presets, or an owner-typed amount. */
export type DepositPreset = DepositPresetPercent | "custom";

/**
 * One row per preset percentage, priced against `basisCents` — the quote
 * total the deposit is taken from.
 *
 * `[]` when `basisCents` is `null`: there is no basis to take a percentage
 * OF, so there are no preset amounts to offer and the UI has nothing but a
 * custom amount to fall back on. A `0` basis still yields all three rows, all
 * `0` — the presets exist, they're just worth nothing against a $0 quote.
 *
 * Routed through `computeDepositCents` in percent mode rather than
 * multiplying here, and that indirection is the point: a preset amount is
 * then IDENTICAL to the rule amount whenever the owner's rule IS that preset,
 * so the pre-selected chip can never show a cent more or less than what the
 * invoice would have been prefilled with anyway. (In percent mode
 * `computeDepositCents` only returns `null` for a `null` basis, which is
 * already handled above; the `?? 0` is unreachable and exists solely to keep
 * the return type honest without a non-null assertion.)
 */
export function computeDepositPresets(
  basisCents: number | null,
): Array<{ percent: DepositPresetPercent; amountCents: number }> {
  if (basisCents === null) return [];

  return DEPOSIT_PRESET_PERCENTS.map((percent) => ({
    percent,
    amountCents:
      computeDepositCents(
        {
          depositMode: "percent",
          depositPercent: percent,
          depositFixedCents: 0,
        },
        basisCents,
      ) ?? 0,
  }));
}

/**
 * Which preset the owner's saved rule corresponds to — i.e. which chip the UI
 * should pre-select.
 *
 * `fixed` mode is always `"custom"`: a fixed-dollar rule is a percentage of
 * nothing, and labelling it "50%" because it happens to equal half of THIS
 * quote would quietly re-anchor it to a percentage on the next one. A
 * percentage outside the offered set (30%, 100%, …) is likewise `"custom"` —
 * the amount is still prefilled from the rule, it just isn't one of the chips.
 */
export function presetForRule(rule: DepositRule): DepositPreset {
  if (rule.depositMode !== "percent") return "custom";
  return (
    DEPOSIT_PRESET_PERCENTS.find(
      (percent) => percent === rule.depositPercent,
    ) ?? "custom"
  );
}

// ─── Lead billing summary ───────────────────────────────────────────────────

/** Every figure the lead card's billing summary shows — see `summarizeLeadBilling`. */
export type LeadBillingSummary = {
  /** The lead's quote amount, or `null` when it has no priced quote yet. */
  quoteCents: number | null;
  /**
   * Every live deposit, paid or not — exactly the set
   * `computeFinalPrefillCents` subtracts. An issued-but-unpaid deposit is
   * counted here on purpose: it is money QuickBooks is already asking the
   * customer for, so billing it again on the final invoice would double-bill.
   */
  invoicedDepositCents: number;
  /** The part of `invoicedDepositCents` QBO has reported as `paid`. */
  paidDepositCents: number;
  /** `invoicedDepositCents − paidDepositCents` — invoiced, not yet collected. */
  unpaidDepositCents: number;
  /**
   * What a final invoice would be prefilled with right now — literally
   * `computeFinalPrefillCents(quoteCents, invoices)`. `null` when
   * `quoteCents` is `null`; floors at 0.
   */
  remainingAfterDepositsCents: number | null;
  /**
   * The amount of the live `final` invoice when one exists — the signal that
   * the balance has already been billed. `null` when there is none.
   */
  liveFinalCents: number | null;
};

/**
 * Derives the whole billing picture for one quote lead in a single pass, so
 * the admin UI renders money it was handed rather than money it computed.
 *
 * Three rules worth stating out loud:
 *
 * 1. Only `deposit` invoices feed the deposit totals. `final` and `custom`
 *    rows are not deposits and never were — folding a custom invoice into
 *    "deposits invoiced" would understate the remaining balance the owner is
 *    about to bill.
 * 2. `remainingAfterDepositsCents` DELEGATES to `computeFinalPrefillCents`
 *    instead of re-deriving `quote − invoiced`. The summary and the amount
 *    actually prefilled into the invoice dialog are then the same number by
 *    construction, including the floor at 0.
 * 3. `liveFinalCents` reports the FIRST live final in the array given. The
 *    router already rejects a second live final per lead, and rows arrive
 *    newest-first, so "first" means "the one that exists" in practice and
 *    "the most recent" if a race ever slipped a second one past the guard.
 */
export function summarizeLeadBilling(input: {
  quoteCents: number | null;
  invoices: ReadonlyArray<{
    kind: string;
    status: string;
    amountCents: number;
  }>;
}): LeadBillingSummary {
  const liveDeposits = input.invoices.filter(
    (invoice) =>
      invoice.kind === "deposit" && isLiveInvoiceStatus(invoice.status),
  );

  const sumCents = (invoices: ReadonlyArray<{ amountCents: number }>): number =>
    invoices.reduce((total, invoice) => total + invoice.amountCents, 0);

  const invoicedDepositCents = sumCents(liveDeposits);
  const paidDepositCents = sumCents(
    liveDeposits.filter((invoice) => invoice.status === "paid"),
  );

  const liveFinal = input.invoices.find(
    (invoice) =>
      invoice.kind === "final" && isLiveInvoiceStatus(invoice.status),
  );

  return {
    quoteCents: input.quoteCents,
    invoicedDepositCents,
    paidDepositCents,
    unpaidDepositCents: invoicedDepositCents - paidDepositCents,
    remainingAfterDepositsCents: computeFinalPrefillCents(
      input.quoteCents,
      input.invoices,
    ),
    liveFinalCents: liveFinal?.amountCents ?? null,
  };
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
 * 3. `DueDate` present and strictly before today **in the business's own
 *    `timeZone`** → `overdue`. The zone is load-bearing, not decoration: QBO
 *    stores `DueDate` as a bare calendar date with no zone, and the sync cron
 *    runs every 15 minutes, so comparing it against the UTC date marks an
 *    invoice due today as overdue for the whole evening west of UTC (7pm in
 *    Detroit is already tomorrow in UTC). The owner would watch a same-day
 *    invoice go red hours before it was actually late, and the customer's
 *    reminder email would say so.
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
  ctx: {
    now: Date;
    previous: InvoiceStatus;
    expectedTotalCents: number;
    /** The business's IANA zone (`Business.timeZone`) — see rule 3. */
    timeZone: string;
  },
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

  // String comparison is correct here and not a shortcut: both sides are
  // zero-padded `YYYY-MM-DD`, whose lexical order IS chronological order.
  const today = zonedCalendarDate(ctx.now, ctx.timeZone);
  const isOverdue =
    typeof qbo.DueDate === "string" &&
    qbo.DueDate.length > 0 &&
    qbo.DueDate < today;
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

/**
 * Translates a SimplePress billing address into Intuit's `PhysicalAddress`
 * shape — the ONE place the field-name mapping lives (`state` →
 * `CountrySubDivisionCode`, `zip` → `PostalCode`).
 *
 * `Line2` is omitted rather than sent empty: QBO echoes back whatever it was
 * given, so an empty `Line2` becomes a blank line on the printed invoice the
 * customer receives. `Country` is hardcoded `"USA"` because
 * `quickBooksBillingAddressSchema` is US-only (2-letter state, 5/9-digit ZIP)
 * — widening the schema to other countries means revisiting this line, not
 * just the validator.
 */
export function toQboBillAddr(address: BillingAddress): QboAddress {
  return {
    Line1: address.line1,
    ...(address.line2 ? { Line2: address.line2 } : {}),
    City: address.city,
    CountrySubDivisionCode: address.state,
    PostalCode: address.zip,
    Country: "USA",
  };
}

/**
 * Request body for creating/updating a QBO `Customer`.
 *
 * `billAddr` is only meaningful on CREATE. QBO customer updates are
 * full-object sparse-or-not writes that require a `SyncToken`, and this
 * integration never issues one — the address a customer was created with is
 * theirs until the owner edits it inside QuickBooks, which SimplePress must
 * not silently overwrite from a stale lead. The per-invoice `BillAddr` (see
 * `buildInvoicePayload`) is what keeps a later invoice accurate.
 */
export function buildCustomerPayload(input: {
  name: string;
  email: string;
  phone?: string | null;
  billAddr?: QboAddress | null;
}): object {
  return {
    DisplayName: input.name,
    PrimaryEmailAddr: { Address: input.email },
    ...(input.phone ? { PrimaryPhone: { FreeFormNumber: input.phone } } : {}),
    ...(input.billAddr ? { BillAddr: input.billAddr } : {}),
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
 * full amount. `memo`, `billAddr`, and the online-payment flags are only
 * included when applicable, since QBO treats an absent key differently from
 * an empty one for some of these fields.
 *
 * When `billAddr` is omitted QBO falls back to the customer record's own
 * address, which is the correct behaviour — an invoice with no snapshot
 * should look exactly like every invoice issued before this field existed,
 * not like one addressed to nowhere.
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
  billAddr?: QboAddress | null;
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
    ...(input.billAddr ? { BillAddr: input.billAddr } : {}),
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
 * resolved to a zone-local calendar date, and `dueDays` is then added to that
 * date on a DST-free scratch calendar. Because no instant (millisecond)
 * arithmetic happens after zoning, a DST transition between `now` and the due
 * date can NEVER shift the result by a day — a due date requested the evening
 * before a spring-forward is still exactly one calendar day later, not two.
 * (An earlier version added `dueDays * 86_400_000` ms to the instant BEFORE
 * formatting, which broke exactly this case — see `mapping.test.ts` for the
 * regression.) Both steps now live in `~/lib/calendar-date`, so this rule has
 * one implementation shared with `deriveInvoiceStatus` above and the quote
 * validators, rather than a copy per caller that can drift.
 *
 * The zone-local date is never the UTC calendar date's — the two can differ
 * by a full day near midnight UTC (e.g. 2026-06-01T03:30Z is still
 * 2026-05-31 in `America/Detroit`).
 *
 * Throws `RangeError` for an invalid IANA `timeZone`. That is a DELIBERATE
 * divergence from `zonedCalendarDate`, which swallows the error and falls
 * back to UTC because it runs inside request-path validation where a tenant's
 * typo must not 500 a submission. Here the stake is different: a due date is
 * written onto a money record and mailed to a customer, so silently pricing
 * it off the wrong calendar is worse than failing loudly at the one moment a
 * bad `Business.timeZone` is still fixable. The probe below is what preserves
 * that — `Intl.DateTimeFormat` validates the zone name at construction.
 */
export function dueDateString(
  now: Date,
  dueDays: number,
  timeZone: string,
): string {
  Intl.DateTimeFormat("en-CA", { timeZone }); // throws RangeError on a bad zone
  return addCalendarDays(zonedCalendarDate(now, timeZone), dueDays);
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
