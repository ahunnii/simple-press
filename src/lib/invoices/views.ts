import "server-only";

import * as Sentry from "@sentry/nextjs";

import type { DbClient } from "~/server/db";
import { isPlatformAdmin } from "~/lib/auth/is-platform-admin";

import { logInvoiceEvent } from "./events";

/** A `VIEWED` timeline row is written at most this often per invoice. */
export const INVOICE_VIEW_EVENT_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Stamp a customer view of the hosted invoice page: `firstViewedAt` once,
 * `lastViewedAt` every time, and a `VIEWED` event at most once per 24 hours
 * (so a customer who leaves the tab open and reloads doesn't flood the
 * timeline).
 *
 * Views by the business's own team (any `BusinessMembership`, including
 * STAFF) and by platform admins are skipped — an owner checking the link
 * they just sent must not read as "customer opened it". Anonymous viewers
 * always count.
 *
 * Drafts are never stamped (the hosted page 404s them anyway).
 *
 * Never throws: this runs in `after()` on the hosted page, and a failed
 * bookkeeping write must not surface anywhere. Failures are reported.
 */
export async function recordInvoiceView(
  db: DbClient,
  args: {
    invoiceId: string;
    businessId: string;
    viewerUserId?: string | null;
    now?: Date;
  },
): Promise<void> {
  const { invoiceId, businessId, viewerUserId } = args;
  const now = args.now ?? new Date();

  try {
    if (viewerUserId) {
      const membership = await db.businessMembership.findUnique({
        where: { userId_businessId: { userId: viewerUserId, businessId } },
        select: { id: true },
      });
      if (membership) return;
      if (await isPlatformAdmin(viewerUserId)) return;
    }

    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, businessId },
      select: { id: true, status: true },
    });
    if (!invoice || invoice.status === "DRAFT") return;

    await db.invoice.updateMany({
      where: { id: invoiceId, businessId, firstViewedAt: null },
      data: { firstViewedAt: now },
    });
    await db.invoice.updateMany({
      where: { id: invoiceId, businessId },
      data: { lastViewedAt: now },
    });

    const recent = await db.invoiceEvent.findFirst({
      where: {
        invoiceId,
        type: "VIEWED",
        createdAt: {
          gt: new Date(now.getTime() - INVOICE_VIEW_EVENT_INTERVAL_MS),
        },
      },
      select: { id: true },
    });
    if (!recent) {
      await logInvoiceEvent(db, { invoiceId, businessId, type: "VIEWED" });
    }
  } catch (err) {
    Sentry.captureException(err, {
      level: "warning",
      tags: { feature: "invoices", step: "record-view" },
      extra: { invoiceId, businessId },
    });
  }
}
