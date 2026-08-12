"use client";

import Link from "next/link";
import { AlertTriangle, CreditCard, Landmark } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { InformAlerts, InformComplianceCard } from "./inform-compliance";
import { RangeSelector } from "./range-selector";
import { RecentPayouts } from "./recent-payouts";

type Data = RouterOutputs["finance"]["getBreakdown"];

function formatCurrency(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function StatTile({
  label,
  value,
  emphasize = false,
  tone,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  tone?: "destructive" | "amber";
}) {
  const toneClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "amber"
        ? "text-amber-600"
        : "";

  return (
    <div
      className={`rounded-lg border p-4 ${emphasize ? "border-primary/40 bg-primary/5" : ""}`}
    >
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

export function FinanceBreakdown({ data }: { data: Data }) {
  const {
    range,
    orders,
    stripe,
    taxCollectedYtdCents,
    stripeAutoTaxEnabled,
    isStripeConnected,
    stripeError,
    inform,
    stripeDetailsSubmitted,
    recentPayouts,
  } = data;

  return (
    <div className="admin-container space-y-6">
      <div className="admin-header">
        <div>
          <h1>Finances</h1>
          <p>
            {range.label} — where every dollar collected actually went
          </p>
        </div>
        <RangeSelector current={range.key} basePath="/admin/finances" />
      </div>

      <InformAlerts
        inform={inform}
        stripeDetailsSubmitted={stripeDetailsSubmitted}
      />

      {/* Card 1 — Money in */}
      <Card>
        <CardHeader>
          <CardTitle>Money in</CardTitle>
          <CardDescription>
            What customers paid, broken down from your orders for {range.label.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <caption className="sr-only">
              Money in breakdown for {range.label}
            </caption>
            <tbody>
              <tr>
                <th scope="row" className="py-2 pr-4 text-left align-top font-semibold">
                  <span className="block text-base font-semibold">
                    Product sales
                  </span>
                  <span className="text-muted-foreground block text-xs font-normal">
                    what you actually earned
                  </span>
                </th>
                <td className="py-2 text-right align-top text-xl font-semibold">
                  {formatCurrency(orders.productSalesCents)}
                </td>
              </tr>
              <tr>
                <td className="text-muted-foreground py-1 pr-4 pl-4 text-left">
                  Shipping collected
                </td>
                <td className="text-muted-foreground py-1 text-right">
                  + {formatCurrency(orders.shippingCents)}
                </td>
              </tr>
              <tr>
                <td className="text-muted-foreground py-1 pr-4 pl-4 text-left">
                  Sales tax collected
                </td>
                <td className="text-muted-foreground py-1 text-right">
                  + {formatCurrency(orders.taxCents)}
                </td>
              </tr>
              <tr className="border-t">
                <th scope="row" className="py-2 pr-4 text-left font-medium">
                  Total charged to customers
                </th>
                <td className="py-2 text-right font-medium">
                  {formatCurrency(orders.totalChargedCents)}
                </td>
              </tr>
              <tr>
                <td className="text-muted-foreground py-1 pr-4 pl-4 text-left">
                  Refunds issued
                </td>
                <td className="text-muted-foreground py-1 text-right">
                  − {formatCurrency(orders.refundedCents)}
                </td>
              </tr>
              <tr className="border-t">
                <th scope="row" className="py-2 pr-4 text-left text-base font-semibold">
                  Net collected
                </th>
                <td className="py-2 text-right text-base font-semibold">
                  {formatCurrency(orders.netCollectedCents)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 space-y-1">
            <p className="text-muted-foreground text-sm">
              {orders.orderCount.toLocaleString()} orders
            </p>
            {orders.manualOrderCount > 0 && (
              <p className="text-muted-foreground text-sm">
                {formatCurrency(orders.viaStripeCents)} via Stripe ·{" "}
                {formatCurrency(orders.viaManualCents)} manual/cash/check
              </p>
            )}
          </div>

          <p className="text-muted-foreground mt-4 text-xs">
            Product sales is your order totals with tax and shipping taken
            out, after discounts. Refunds are spread across the three lines
            above in proportion to each order.
          </p>
        </CardContent>
      </Card>

      {/* Card 2 — What Stripe took */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            What Stripe took
          </CardTitle>
          <CardDescription>
            Processing fees, refunds, and adjustments on the Stripe side for{" "}
            {range.label.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isStripeConnected ? (
            <p className="text-muted-foreground text-sm">
              Connect your Stripe account in{" "}
              <Link
                href="/admin/settings/integrations"
                className="underline underline-offset-2"
              >
                Settings → Integrations
              </Link>{" "}
              to see what Stripe took.
            </p>
          ) : stripeError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Stripe figures temporarily unavailable</AlertTitle>
              <AlertDescription>
                We couldn&apos;t reach Stripe just now, so the figures below
                can&apos;t be shown. The Money in card above is unaffected —
                it&apos;s computed entirely from your own order records. Try
                refreshing in a few minutes.
              </AlertDescription>
            </Alert>
          ) : !stripe ? (
            <p className="text-muted-foreground text-sm">
              Stripe data is temporarily unavailable.
            </p>
          ) : (
            <>
              {stripe.partial && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Some Stripe figures could not be loaded</AlertTitle>
                  <AlertDescription>
                    Part of this call to Stripe failed. Any figure below
                    showing $0 may be incomplete rather than genuinely zero.
                    The Money in card above is unaffected.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatTile
                  label="Gross charges"
                  value={formatCurrency(stripe.grossChargesCents)}
                />
                <StatTile
                  label="Processing fees"
                  value={`− ${formatCurrency(stripe.processingFeesCents)}`}
                />
                <StatTile
                  label="Refunds"
                  value={`− ${formatCurrency(stripe.refundsCents)}`}
                />
                {stripe.disputeAdjustmentsCents !== 0 && (
                  <StatTile
                    label="Dispute adjustments"
                    value={formatCurrency(stripe.disputeAdjustmentsCents)}
                    tone={
                      stripe.disputeAdjustmentsCents < 0
                        ? "destructive"
                        : undefined
                    }
                  />
                )}
                <StatTile
                  label="Net added to your balance"
                  value={formatCurrency(stripe.netToBalanceCents)}
                  emphasize
                />
                <StatTile
                  label="Paid out to bank"
                  value={formatCurrency(stripe.paidOutCents)}
                />
                <StatTile
                  label="Available now"
                  value={formatCurrency(stripe.balanceAvailableCents)}
                />
                <StatTile
                  label="Pending"
                  value={formatCurrency(stripe.balancePendingCents)}
                />
              </div>

              {stripe.truncated && (
                <p className="text-muted-foreground mt-4 text-xs">
                  This range has more Stripe transactions than we can fetch in
                  one pass, so these totals are partial. Try a shorter range
                  for exact figures.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent payouts */}
      <RecentPayouts
        recentPayouts={recentPayouts}
        isStripeConnected={isStripeConnected}
      />

      {/* INFORM Act compliance card — deep-link target for the alerts above */}
      <div id="inform" className="scroll-mt-20">
        <InformComplianceCard
          inform={inform}
          stripeDetailsSubmitted={stripeDetailsSubmitted}
        />
      </div>

      {/* Card 3 — Set aside */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Set aside
          </CardTitle>
          <CardDescription>
            Sales tax you collected on the state&apos;s behalf
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">
                Tax collected — {range.label.toLowerCase()}
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCurrency(orders.taxCents)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">
                Tax collected — calendar year to date
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCurrency(taxCollectedYtdCents)}
              </p>
            </div>
          </div>

          {!stripeAutoTaxEnabled && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Automatic tax is off</AlertTitle>
              <AlertDescription>
                Without Stripe Tax enabled, checkout may not be collecting the
                correct amount of sales tax in every jurisdiction you sell
                to. Review your{" "}
                <Link href="/admin/finances/tax-guide" className="underline underline-offset-2">
                  tax settings
                </Link>
                .
              </AlertDescription>
            </Alert>
          )}

          <p className="text-muted-foreground text-xs">
            Sales tax isn&apos;t your money — you collect it on the state&apos;s
            behalf and remit it. See the{" "}
            <Link href="/admin/finances/tax-guide" className="underline underline-offset-2">
              tax guide
            </Link>{" "}
            for nexus thresholds and remittance steps.
          </p>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        The Money in and Stripe panels will rarely tie out exactly: orders are
        counted by order date while Stripe counts by settlement date, manual
        and cash orders never appear on the Stripe side, and disputes or
        adjustments can land outside the selected range. This page excludes
        cancelled orders.
      </p>
    </div>
  );
}
