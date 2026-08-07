"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle,
  CreditCard,
  ExternalLink,
} from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

type Data = RouterOutputs["business"]["getPaymentsOverview"];

const INFORM_TRANSACTION_THRESHOLD = 200;
const INFORM_REVENUE_THRESHOLD_CENTS = 500_000; // $5,000

function formatCurrency(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function PayoutStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    paid: "bg-green-100 text-green-800",
    in_transit: "bg-blue-100 text-blue-800",
    pending: "bg-gray-100 text-gray-700",
    failed: "bg-red-100 text-red-800",
    canceled: "bg-red-100 text-red-800",
  };
  const label: Record<string, string> = {
    paid: "Paid",
    in_transit: "In Transit",
    pending: "Pending",
    failed: "Failed",
    canceled: "Canceled",
  };
  const cls = variants[status] ?? "bg-gray-100 text-gray-700";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label[status] ?? status}
    </span>
  );
}

export function PaymentsOverview({ data }: { data: Data }) {
  const {
    annualTransactions,
    annualRevenueCents,
    informActThresholdReached,
    stripeDetailsSubmitted,
    stripeBalance,
    recentPayouts,
    isStripeConnected,
  } = data;

  const transactionPct = Math.min(
    (annualTransactions / INFORM_TRANSACTION_THRESHOLD) * 100,
    100,
  );
  const revenuePct = Math.min(
    (annualRevenueCents / INFORM_REVENUE_THRESHOLD_CENTS) * 100,
    100,
  );

  // Warn at 75% of either metric so owners can verify before being required to
  const isApproachingThreshold =
    !informActThresholdReached &&
    !stripeDetailsSubmitted &&
    (transactionPct >= 75 || revenuePct >= 75);

  const availableTotal = (stripeBalance?.available ?? []).reduce(
    (sum, b) => sum + b.amount,
    0,
  );
  const pendingTotal = (stripeBalance?.pending ?? []).reduce(
    (sum, b) => sum + b.amount,
    0,
  );
  const primaryCurrency =
    stripeBalance?.available[0]?.currency ??
    stripeBalance?.pending[0]?.currency ??
    "usd";

  return (
    <div className="admin-container space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <Link
          href="/admin/finances"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors underline underline-offset-2"
        >
          View full breakdown →
        </Link>
      </div>

      {/* INFORM Act warning — shown at 75% so owners can verify before being required to */}
      {isApproachingThreshold && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Approaching INFORM Act Threshold</AlertTitle>
          <AlertDescription className="mt-1 space-y-2">
            <p>
              You&apos;re getting close to the limit that requires seller
              identity verification under the{" "}
              <strong>INFORM Consumers Act</strong>. Complete your Stripe
              account verification now so you&apos;re ready before it&apos;s
              required.
            </p>
            <Button
              size="sm"
              variant="outline"
              asChild
              className="border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
            >
              <a
                href="https://dashboard.stripe.com/settings/identity"
                target="_blank"
                rel="noopener noreferrer"
              >
                Start Verification
                <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* INFORM Act alert — shown when threshold crossed and not yet verified */}
      {informActThresholdReached && !stripeDetailsSubmitted && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Seller Verification Required</AlertTitle>
          <AlertDescription className="mt-1 space-y-2">
            <p>
              Your store has reached a threshold that may require identity
              verification under the <strong>INFORM Consumers Act</strong> (200+
              transactions or $5,000+ in annual sales). Please complete your
              Stripe account verification to remain compliant.
            </p>
            <Button size="sm" variant="outline" asChild>
              <a
                href="https://dashboard.stripe.com/settings/identity"
                target="_blank"
                rel="noopener noreferrer"
              >
                Complete Verification
                <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* INFORM Act compliance card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>INFORM Act Compliance</CardTitle>
              <CardDescription>
                Annual transaction and revenue thresholds that trigger seller
                verification requirements
              </CardDescription>
            </div>
            {informActThresholdReached ? (
              stripeDetailsSubmitted ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Action Required
                </Badge>
              )
            ) : (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Below Thresholds
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Annual Transactions</span>
              <span className="font-medium">
                {annualTransactions.toLocaleString()} /{" "}
                {INFORM_TRANSACTION_THRESHOLD}
              </span>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full transition-all ${
                  transactionPct >= 100
                    ? "bg-red-500"
                    : transactionPct >= 80
                      ? "bg-amber-500"
                      : "bg-green-500"
                }`}
                style={{ width: `${transactionPct}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Annual Revenue</span>
              <span className="font-medium">
                {formatCurrency(annualRevenueCents)} / $5,000
              </span>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full transition-all ${
                  revenuePct >= 100
                    ? "bg-red-500"
                    : revenuePct >= 80
                      ? "bg-amber-500"
                      : "bg-green-500"
                }`}
                style={{ width: `${revenuePct}%` }}
              />
            </div>
          </div>

          <p className="text-muted-foreground text-xs">
            Figures reflect the current calendar year (orders that were paid,
            including any later refunded or disputed).
            Thresholds trigger when either condition is met.{" "}
            <a
              href="https://www.ftc.gov/business-guidance/blog/2023/06/inform-act"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Learn more about the INFORM Act
            </a>
          </p>
        </CardContent>
      </Card>

      {/* Balance card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Stripe Balance
          </CardTitle>
          <CardDescription>
            Funds in your connected Stripe account
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
              to view your balance.
            </p>
          ) : stripeBalance ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">
                  Available to Pay Out
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatCurrency(availableTotal, primaryCurrency)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Pending</p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatCurrency(pendingTotal, primaryCurrency)}
                </p>
              </div>
              <p className="text-muted-foreground text-xs sm:col-span-2">
                Funds are typically paid out to your bank account within 2–7
                business days based on your payout schedule.{" "}
                <a
                  href="https://dashboard.stripe.com/balance"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  View in Stripe →
                </a>
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Balance data temporarily unavailable.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent payouts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payouts</CardTitle>
          <CardDescription>Last 5 payouts to your bank account</CardDescription>
        </CardHeader>
        <CardContent>
          {!isStripeConnected ? (
            <p className="text-muted-foreground text-sm">
              Connect your Stripe account to view payouts.
            </p>
          ) : !recentPayouts || recentPayouts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No payouts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Estimated Arrival</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-medium">
                      {formatCurrency(payout.amount, payout.currency)}
                    </TableCell>
                    <TableCell>
                      <PayoutStatusBadge status={payout.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(payout.arrival_date * 1000).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
