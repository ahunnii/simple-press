import { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { TxClient } from "~/server/db";
import { isRealCalendarDate, zonedCalendarDate } from "~/lib/calendar-date";
import {
  applyMovement,
  getOutstandingByItem,
  isCheckoutOverdue,
  lineOutstanding,
  lockItems,
  recordWriteOff,
  rethrowMovementError,
  withManualInventoryTx,
} from "~/lib/inventory";
import {
  todayUtcMidnight,
  utcMidnightToYmd,
  ymdToUtcMidnight,
} from "~/lib/invoices/status";
import { MAX_REQUESTED_PAGE } from "~/lib/validators/admin-table";
import {
  createTRPCRouter,
  featureGate,
  staffProcedure,
} from "~/server/api/trpc";

/**
 * Rental check-outs: units of `itemType: "rental"` inventory items going out
 * to an event/client and coming back.
 *
 * `inventoryRentals` is `ownerCanToggle: true` (and depends on `inventory`),
 * so this router follows the invoice router's read/books/gated split:
 *
 * - **Reads** (`coRead`, gated on `inventory` only): `list`, `getById`.
 *   Turning rentals off must never hide check-outs that still have units out.
 * - **Bookkeeping** (`coBooks`, gated on `inventory` only): `checkIn`,
 *   `updateDetails`. Units that are out when the owner flips rentals off still
 *   have to come back (and be written off if damaged/lost), and a typo in a
 *   label must stay fixable; freezing these would make the toggle destructive
 *   and leave the item's on-hand count permanently short.
 * - **Gated** (`coGated`, `inventory` + `inventoryRentals`): `create`,
 *   `availableRentalItems` — everything that starts NEW rental activity.
 *
 * All three are `staffProcedure`: checking gear out and back in is the STAFF
 * role's day-to-day work. Nothing here exposes unit cost.
 *
 * Every row read is scoped `{ id, businessId }`, so a foreign id is
 * indistinguishable from a missing one (NOT_FOUND). Quantity changes go
 * through the manual ledger (`~/lib/inventory/manual-movement`): item rows are
 * locked inside `withManualInventoryTx`, so check-outs and check-ins never
 * race the order path or each other. `checkIn` additionally locks the
 * check-out row first, so two concurrent check-ins of the same line are
 * serialized and the second is validated against the first one's result.
 *
 * `notes` is `/// @encrypted` — it is never used in a `where`.
 */
const coRead = staffProcedure.use(featureGate("inventory"));
const coBooks = staffProcedure.use(featureGate("inventory"));
const coGated = staffProcedure
  .use(featureGate("inventory"))
  .use(featureGate("inventoryRentals"));

export const CHECKOUT_PAGE_SIZE = 25;
export const CHECKOUT_LIST_STATUSES = [
  "open",
  "overdue",
  "closed",
  "all",
] as const;
export type CheckoutListStatus = (typeof CHECKOUT_LIST_STATUSES)[number];

const LABEL_MAX = 191;
const CUSTOMER_MAX = 191;
const NOTES_MAX = 5000;
const CHECKIN_NOTE_MAX = 500;
const SEARCH_MAX = 100;
const MAX_LINES = 200;
const MAX_LINE_QTY = 100_000;
/** How far in the future a back-dated/forward-dated check-out may be. */
const CHECKED_OUT_AT_FUTURE_SLACK_MS = 24 * 60 * 60 * 1000;

// ─── Schemas ─────────────────────────────────────────────────────────────────

const idField = z.string().min(1).max(64);

const ymdField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine(isRealCalendarDate, "Enter a real calendar date");

const labelField = z
  .string()
  .trim()
  .min(1, "Label is required")
  .max(LABEL_MAX, `Label must be ${LABEL_MAX} characters or fewer`);

const listInput = z.object({
  status: z.enum(CHECKOUT_LIST_STATUSES).default("open"),
  search: z.string().trim().max(SEARCH_MAX).optional(),
  page: z.number().int().positive().max(MAX_REQUESTED_PAGE).default(1),
});

const createInput = z.object({
  label: labelField,
  customerName: z.string().trim().max(CUSTOMER_MAX).optional(),
  notes: z.string().trim().max(NOTES_MAX).optional(),
  checkedOutAt: z.date().optional(),
  dueBackOn: ymdField.optional(),
  lines: z
    .array(
      z.object({
        itemId: idField,
        qty: z.number().int().min(1).max(MAX_LINE_QTY),
      }),
    )
    .min(1, "Add at least one item")
    .max(MAX_LINES),
});

const checkInInput = z.object({
  checkoutId: idField,
  lines: z
    .array(
      z.object({
        lineId: idField,
        returned: z.number().int().min(0).max(MAX_LINE_QTY),
        damaged: z.number().int().min(0).max(MAX_LINE_QTY),
        lost: z.number().int().min(0).max(MAX_LINE_QTY),
      }),
    )
    .min(1)
    .max(MAX_LINES),
  note: z.string().trim().max(CHECKIN_NOTE_MAX).optional(),
});

const updateDetailsInput = z.object({
  id: idField,
  label: labelField.optional(),
  customerName: z.string().trim().max(CUSTOMER_MAX).nullable().optional(),
  notes: z.string().trim().max(NOTES_MAX).nullable().optional(),
  dueBackOn: ymdField.nullable().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed;
}

function notFound(): TRPCError {
  return new TRPCError({ code: "NOT_FOUND", message: "Check-out not found" });
}

async function loadTimeZone(
  db: Pick<TxClient, "business">,
  businessId: string,
): Promise<string> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { timeZone: true },
  });
  if (!business) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
  }
  return business.timeZone;
}

/** The due date may not fall before the (local) day the units went out. */
function assertDueNotBeforeCheckout(
  dueYmd: string,
  checkedOutAt: Date,
  timeZone: string,
): void {
  const outYmd = zonedCalendarDate(checkedOutAt, timeZone);
  if (dueYmd < outYmd) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The due date can't be before the check-out date",
    });
  }
}

function statusWhere(
  status: CheckoutListStatus,
  today: Date,
): Prisma.InventoryCheckoutWhereInput {
  switch (status) {
    case "open":
      return { status: "open" };
    case "overdue":
      return { status: "open", dueBackOn: { lt: today } };
    case "closed":
      return { status: "closed" };
    case "all":
      return {};
  }
}

function searchWhere(
  search: string | undefined,
): Prisma.InventoryCheckoutWhereInput | null {
  const term = search?.trim();
  if (!term) return null;
  // `notes` is encrypted at rest — never filter on it.
  return {
    OR: [
      { label: { contains: term, mode: "insensitive" } },
      { customerName: { contains: term, mode: "insensitive" } },
    ],
  };
}

function listOrderBy(
  status: CheckoutListStatus,
): Prisma.InventoryCheckoutOrderByWithRelationInput[] {
  if (status === "open" || status === "overdue") {
    return [
      { dueBackOn: { sort: "asc", nulls: "last" } },
      { checkedOutAt: "desc" },
      { id: "asc" },
    ];
  }
  return [{ checkedOutAt: "desc" }, { id: "asc" }];
}

const USER_SELECT = { name: true, email: true } as const;

/** Merge duplicate item ids (summing qty), keeping first-seen order. */
function mergeLines(
  lines: readonly { itemId: string; qty: number }[],
): { itemId: string; qty: number }[] {
  const merged = new Map<string, number>();
  for (const line of lines) {
    merged.set(line.itemId, (merged.get(line.itemId) ?? 0) + line.qty);
  }
  return [...merged].map(([itemId, qty]) => ({ itemId, qty }));
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const inventoryCheckoutRouter = createTRPCRouter({
  /**
   * Paginated check-outs. `overdue` = open and due before today in the
   * business's zone. `counts` honor `search` but not `status`, so each filter
   * tab's badge matches what clicking it would show.
   */
  list: coRead.input(listInput).query(async ({ ctx, input }) => {
    const { businessId } = ctx;
    const now = new Date();
    const timeZone = await loadTimeZone(ctx.db, businessId);
    const today = todayUtcMidnight(now, timeZone);
    const search = searchWhere(input.search);
    const base: Prisma.InventoryCheckoutWhereInput[] = [
      { businessId },
      ...(search ? [search] : []),
    ];
    const where: Prisma.InventoryCheckoutWhereInput = {
      AND: [...base, statusWhere(input.status, today)],
    };

    const [totalCount, open, overdue, closed] = await Promise.all([
      ctx.db.inventoryCheckout.count({ where }),
      ctx.db.inventoryCheckout.count({
        where: { AND: [...base, statusWhere("open", today)] },
      }),
      ctx.db.inventoryCheckout.count({
        where: { AND: [...base, statusWhere("overdue", today)] },
      }),
      ctx.db.inventoryCheckout.count({
        where: { AND: [...base, statusWhere("closed", today)] },
      }),
    ]);

    const pageSize = CHECKOUT_PAGE_SIZE;
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
    const page = Math.min(input.page, pageCount);

    const records = await ctx.db.inventoryCheckout.findMany({
      where,
      orderBy: listOrderBy(input.status),
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        label: true,
        customerName: true,
        status: true,
        checkedOutAt: true,
        dueBackOn: true,
        closedAt: true,
        createdBy: { select: USER_SELECT },
        lines: {
          select: {
            qtyOut: true,
            qtyReturned: true,
            qtyDamaged: true,
            qtyLost: true,
          },
        },
      },
    });

    const rows = records.map(({ lines, ...record }) => ({
      ...record,
      overdue: isCheckoutOverdue(record, now, timeZone),
      lineCount: lines.length,
      unitsOut: lines.reduce((sum, l) => sum + l.qtyOut, 0),
      outstanding: lines.reduce((sum, l) => sum + lineOutstanding(l), 0),
    }));

    return {
      rows,
      totalCount,
      page,
      pageCount,
      pageSize,
      counts: { open, overdue, closed },
      timeZone,
    };
  }),

  /** One check-out with its lines and the ledger rows it wrote. */
  getById: coRead
    .input(z.object({ id: idField }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const now = new Date();
      const [timeZone, checkout] = await Promise.all([
        loadTimeZone(ctx.db, businessId),
        ctx.db.inventoryCheckout.findFirst({
          where: { id: input.id, businessId },
          select: {
            id: true,
            label: true,
            customerName: true,
            notes: true,
            status: true,
            checkedOutAt: true,
            dueBackOn: true,
            closedAt: true,
            createdAt: true,
            updatedAt: true,
            createdBy: { select: USER_SELECT },
            lines: {
              orderBy: [{ itemName: "asc" }, { id: "asc" }],
              select: {
                id: true,
                itemId: true,
                itemName: true,
                qtyOut: true,
                qtyReturned: true,
                qtyDamaged: true,
                qtyLost: true,
                item: {
                  select: { id: true, name: true, sku: true, itemType: true },
                },
              },
            },
            history: {
              where: { businessId },
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              select: {
                id: true,
                reason: true,
                changeQty: true,
                previousQty: true,
                newQty: true,
                note: true,
                createdAt: true,
                baseInventoryUnitId: true,
                baseInventoryUnit: { select: { name: true } },
                user: { select: USER_SELECT },
              },
            },
          },
        }),
      ]);
      if (!checkout) throw notFound();

      const lines = checkout.lines.map((line) => ({
        ...line,
        outstanding: lineOutstanding(line),
      }));
      const history = checkout.history.map(
        ({ baseInventoryUnit, baseInventoryUnitId, ...row }) => ({
          ...row,
          itemId: baseInventoryUnitId,
          itemName: baseInventoryUnit?.name ?? null,
        }),
      );

      return {
        ...checkout,
        dueBackOnYmd: checkout.dueBackOn
          ? utcMidnightToYmd(checkout.dueBackOn)
          : null,
        overdue: isCheckoutOverdue(checkout, now, timeZone),
        outstanding: lines.reduce((sum, l) => sum + l.outstanding, 0),
        lines,
        history,
        timeZone,
      };
    }),

  /** Rental items for the new-check-out picker (no cost — staff-safe). */
  availableRentalItems: coGated.query(async ({ ctx }) => {
    const { businessId } = ctx;
    const items = await ctx.db.baseInventoryUnit.findMany({
      where: { businessId, itemType: "rental" },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        inventoryQty: true,
        reservedQty: true,
      },
    });
    const out = await getOutstandingByItem(
      ctx.db,
      businessId,
      items.map((i) => i.id),
    );
    return items.map((item) => ({
      ...item,
      available: Math.max(0, item.inventoryQty - item.reservedQty),
      outQty: out.get(item.id) ?? 0,
    }));
  }),

  /**
   * Check rental units out. All-or-nothing: if any line is short, nothing is
   * written and the error lists every short item.
   */
  create: coGated.input(createInput).mutation(async ({ ctx, input }) => {
    const { businessId } = ctx;
    const userId = ctx.session.user.id;
    const now = new Date();
    const checkedOutAt = input.checkedOutAt ?? now;
    if (
      checkedOutAt.getTime() >
      now.getTime() + CHECKED_OUT_AT_FUTURE_SLACK_MS
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "The check-out date can't be in the future",
      });
    }
    const timeZone = await loadTimeZone(ctx.db, businessId);
    if (input.dueBackOn) {
      assertDueNotBeforeCheckout(input.dueBackOn, checkedOutAt, timeZone);
    }
    const lines = mergeLines(input.lines);
    const label = input.label.trim();

    try {
      return await withManualInventoryTx(ctx.db, async (tx) => {
        const items = await lockItems(tx, {
          businessId,
          ids: lines.map((l) => l.itemId),
        });

        for (const line of lines) {
          const item = items.get(line.itemId)!;
          if (item.itemType !== "rental") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `${item.name} is a stock item — only rental items can be checked out`,
            });
          }
        }

        const short: string[] = [];
        for (const line of lines) {
          const item = items.get(line.itemId)!;
          const available = Math.max(0, item.inventoryQty - item.reservedQty);
          if (line.qty > available) {
            short.push(
              `${item.name}: ${available} available, ${line.qty} requested`,
            );
          }
        }
        if (short.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: short.join("; "),
          });
        }

        const checkout = await tx.inventoryCheckout.create({
          data: {
            businessId,
            label,
            customerName: blankToNull(input.customerName),
            notes: blankToNull(input.notes),
            status: "open",
            checkedOutAt,
            dueBackOn: input.dueBackOn
              ? ymdToUtcMidnight(input.dueBackOn)
              : null,
            createdById: userId,
            lines: {
              create: lines.map((line) => ({
                businessId,
                itemId: line.itemId,
                itemName: items.get(line.itemId)!.name,
                qtyOut: line.qty,
              })),
            },
          },
          select: { id: true },
        });

        for (const line of lines) {
          await applyMovement(tx, items.get(line.itemId)!, {
            movement: { mode: "delta", delta: -line.qty, guard: "available" },
            reason: "checkout",
            note: label,
            userId,
            checkoutId: checkout.id,
          });
        }

        return { id: checkout.id };
      });
    } catch (err) {
      rethrowMovementError(err);
    }
  }),

  /**
   * Check units back in: `returned` go back on hand, `damaged`/`lost` are
   * written off (they left on-hand at check-out, so their ledger rows carry
   * changeQty 0). Closes the check-out when nothing is outstanding.
   */
  checkIn: coBooks.input(checkInInput).mutation(async ({ ctx, input }) => {
    const { businessId } = ctx;
    const userId = ctx.session.user.id;
    const note = blankToNull(input.note);

    const seen = new Set<string>();
    for (const line of input.lines) {
      if (seen.has(line.lineId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Each line can only be checked in once per request",
        });
      }
      seen.add(line.lineId);
    }
    const submitted = input.lines.filter(
      (l) => l.returned + l.damaged + l.lost > 0,
    );
    if (submitted.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Nothing to check in",
      });
    }

    try {
      return await withManualInventoryTx(ctx.db, async (tx) => {
        // Serialize check-ins of this check-out: a concurrent one waits here
        // and then validates against the committed counters.
        const [locked] = await tx.$queryRaw<{ id: string; status: string }[]>(
          Prisma.sql`
            SELECT "id", "status" FROM "InventoryCheckout"
            WHERE "id" = ${input.checkoutId} AND "businessId" = ${businessId}
            FOR UPDATE
          `,
        );
        if (!locked) throw notFound();
        if (locked.status === "closed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This check-out is already closed",
          });
        }

        const allLines = await tx.inventoryCheckoutLine.findMany({
          where: { checkoutId: locked.id, businessId },
          select: {
            id: true,
            itemId: true,
            itemName: true,
            qtyOut: true,
            qtyReturned: true,
            qtyDamaged: true,
            qtyLost: true,
          },
        });
        const byId = new Map(allLines.map((l) => [l.id, l]));

        const problems: string[] = [];
        for (const sub of submitted) {
          const line = byId.get(sub.lineId);
          if (!line) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "That line isn't part of this check-out",
            });
          }
          const outstanding = lineOutstanding(line);
          const total = sub.returned + sub.damaged + sub.lost;
          if (total > outstanding) {
            problems.push(`${line.itemName}: only ${outstanding} still out`);
          } else if (line.itemId === null && sub.returned > 0) {
            problems.push(
              `${line.itemName}: the item was deleted, so units can only be marked damaged or lost`,
            );
          }
        }
        if (problems.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: problems.join("; "),
          });
        }

        const itemIds = submitted
          .map((s) => byId.get(s.lineId)!.itemId)
          .filter((id): id is string => id !== null);
        const items = await lockItems(tx, { businessId, ids: itemIds });

        for (const sub of submitted) {
          const line = byId.get(sub.lineId)!;
          const item = line.itemId ? items.get(line.itemId)! : null;
          if (item) {
            if (sub.returned > 0) {
              await applyMovement(tx, item, {
                movement: { mode: "delta", delta: sub.returned, guard: "none" },
                reason: "checkin",
                note,
                userId,
                checkoutId: locked.id,
              });
            }
            if (sub.damaged > 0) {
              await recordWriteOff(tx, item, {
                reason: "damage",
                qty: sub.damaged,
                note,
                userId,
                checkoutId: locked.id,
              });
            }
            if (sub.lost > 0) {
              await recordWriteOff(tx, item, {
                reason: "lost",
                qty: sub.lost,
                note,
                userId,
                checkoutId: locked.id,
              });
            }
          }
          await tx.inventoryCheckoutLine.update({
            where: { id: line.id },
            data: {
              qtyReturned: { increment: sub.returned },
              qtyDamaged: { increment: sub.damaged },
              qtyLost: { increment: sub.lost },
            },
          });
          line.qtyReturned += sub.returned;
          line.qtyDamaged += sub.damaged;
          line.qtyLost += sub.lost;
        }

        const outstanding = allLines.reduce(
          (sum, l) => sum + lineOutstanding(l),
          0,
        );
        const closed = outstanding <= 0;
        if (closed) {
          await tx.inventoryCheckout.update({
            where: { id: locked.id },
            data: { status: "closed", closedAt: new Date() },
          });
        }
        return { closed, outstanding: Math.max(0, outstanding) };
      });
    } catch (err) {
      rethrowMovementError(err);
    }
  }),

  /** Edit label / customer / notes / due date. Allowed on closed check-outs. */
  updateDetails: coBooks
    .input(updateDetailsInput)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const existing = await ctx.db.inventoryCheckout.findFirst({
        where: { id: input.id, businessId },
        select: { id: true, checkedOutAt: true },
      });
      if (!existing) throw notFound();

      const data: Prisma.InventoryCheckoutUpdateInput = {};
      if (input.label !== undefined) data.label = input.label.trim();
      if (input.customerName !== undefined) {
        data.customerName = blankToNull(input.customerName);
      }
      if (input.notes !== undefined) data.notes = blankToNull(input.notes);
      if (input.dueBackOn !== undefined) {
        if (input.dueBackOn === null) {
          data.dueBackOn = null;
        } else {
          const timeZone = await loadTimeZone(ctx.db, businessId);
          assertDueNotBeforeCheckout(
            input.dueBackOn,
            existing.checkedOutAt,
            timeZone,
          );
          data.dueBackOn = ymdToUtcMidnight(input.dueBackOn);
        }
      }

      await ctx.db.inventoryCheckout.update({
        where: { id: existing.id },
        data,
        select: { id: true },
      });
      return { id: existing.id };
    }),
});
