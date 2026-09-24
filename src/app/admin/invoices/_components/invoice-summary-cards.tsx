import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import {
  CARD_STRETCHED_LINK,
  INTERACTIVE_CARD,
} from "../../_components/admin-card-grid";
import { WARNING_TEXT } from "../../_components/admin-table-style";

type Summary = RouterOutputs["invoice"]["summary"];

type SummaryCard = {
  key: string;
  label: string;
  amountCents: number;
  detail: string;
  /** Filter shortcut; omitted for "Paid, last 30 days", which no tab matches exactly. */
  href?: string;
  /** Exact match on the current view, so at most one card reads as selected. */
  active?: boolean;
  warning?: boolean;
};

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "invoice" : "invoices"}`;
}

/**
 * Business-wide money totals above the unified list (native + QuickBooks,
 * from `invoice.summary`). Unaffected by the current filters, like the Orders
 * queue cards this borrows its treatment from — and, like those, the linked
 * cards double as filter shortcuts via the stretched-link pattern
 * (`admin-card-grid.tsx`).
 */
export function InvoiceSummaryCards({
  summary,
  basePath,
  activeStatus,
}: {
  summary: Summary;
  basePath: string;
  /** The status tab currently shown, when no other filter narrows it — drives the selected ring. */
  activeStatus: string | null;
}) {
  const hasOverdue = summary.overdueCount > 0;

  const cards: SummaryCard[] = [
    {
      key: "outstanding",
      label: "Outstanding",
      amountCents: summary.outstandingCents,
      detail: countLabel(summary.outstandingCount),
      href: `${basePath}?status=outstanding`,
      active: activeStatus === "outstanding",
    },
    {
      key: "overdue",
      label: "Overdue",
      amountCents: summary.overdueCents,
      detail: countLabel(summary.overdueCount),
      href: `${basePath}?status=overdue`,
      active: activeStatus === "overdue",
      warning: hasOverdue,
    },
    {
      key: "paid-30",
      label: "Paid, last 30 days",
      amountCents: summary.paidLast30Cents,
      detail: "Payments received",
    },
  ];

  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-3 md:gap-6">
      {cards.map((card) => (
        // INTERACTIVE_CARD carries `py-0` for edge-to-edge media; a text-only
        // stat card wants the Card's vertical padding back (Orders precedent).
        <Card
          key={card.key}
          className={cn(
            card.href ? INTERACTIVE_CARD : undefined,
            "py-6",
            card.active && "ring-ring ring-2",
          )}
        >
          <CardHeader>
            <CardDescription>
              {card.href ? (
                <Link
                  href={card.href}
                  aria-current={card.active ? "true" : undefined}
                  className={CARD_STRETCHED_LINK}
                >
                  {card.label}
                </Link>
              ) : (
                card.label
              )}
            </CardDescription>
            <CardTitle
              className={cn(
                "text-2xl tabular-nums md:text-3xl",
                card.warning && WARNING_TEXT,
              )}
            >
              {formatPrice(card.amountCents)}
            </CardTitle>
            <p
              className={cn(
                "text-muted-foreground text-xs tabular-nums",
                card.warning && WARNING_TEXT,
              )}
            >
              {card.detail}
            </p>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
