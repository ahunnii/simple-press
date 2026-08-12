"use client";

import { AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";

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
import { formatCurrency } from "~/lib/utils";

type BreakdownData = RouterOutputs["finance"]["getBreakdown"];

const INFORM_TRANSACTION_THRESHOLD = 200;
const INFORM_REVENUE_THRESHOLD_CENTS = 500_000; // $5,000

export type InformComplianceProps = {
  inform: BreakdownData["inform"];
  stripeDetailsSubmitted: BreakdownData["stripeDetailsSubmitted"];
};

/**
 * Amber "approaching threshold" + destructive "verification required"
 * alerts. Rendered near the top of the Finances page, separate from
 * `InformComplianceCard` (which lives further down, anchored at `#inform`).
 */
export function InformAlerts({
  inform,
  stripeDetailsSubmitted,
}: InformComplianceProps) {
  const transactionPct = Math.min(
    (inform.annualTransactions / INFORM_TRANSACTION_THRESHOLD) * 100,
    100,
  );
  const revenuePct = Math.min(
    (inform.annualRevenueCents / INFORM_REVENUE_THRESHOLD_CENTS) * 100,
    100,
  );

  // Warn at 75% of either metric so owners can verify before being required
  // to. `!stripeDetailsSubmitted` is intentionally true for both `false` and
  // `null` (unknown) — either way verification isn't confirmed yet.
  const isApproachingThreshold =
    !inform.thresholdReached &&
    !stripeDetailsSubmitted &&
    (transactionPct >= 75 || revenuePct >= 75);

  // The destructive alert requires an explicit `false`. `null` means unknown
  // (not connected to Stripe, or the account read failed) and must not claim
  // verification is missing.
  const needsVerification =
    inform.thresholdReached && stripeDetailsSubmitted === false;

  if (!isApproachingThreshold && !needsVerification) return null;

  return (
    <div className="space-y-4">
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

      {needsVerification && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Seller Verification Required</AlertTitle>
          <AlertDescription className="mt-1 space-y-2">
            <p>
              Your store has reached a threshold that may require identity
              verification under the <strong>INFORM Consumers Act</strong>{" "}
              (200+ transactions or $5,000+ in annual sales). Please complete
              your Stripe account verification to remain compliant.
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
    </div>
  );
}

function ComplianceBadge({
  thresholdReached,
  stripeDetailsSubmitted,
}: {
  thresholdReached: boolean;
  stripeDetailsSubmitted: boolean | null;
}) {
  if (!thresholdReached) {
    return (
      <Badge variant="secondary" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Below Thresholds
      </Badge>
    );
  }

  if (stripeDetailsSubmitted === true) {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Verified
      </Badge>
    );
  }

  if (stripeDetailsSubmitted === false) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Action Required
      </Badge>
    );
  }

  // stripeDetailsSubmitted === null: verification status unknown (not
  // connected to Stripe, or the account read failed) — fall back to a
  // threshold-only presentation instead of asserting verified or missing.
  return (
    <Badge variant="secondary" className="gap-1">
      <AlertTriangle className="h-3 w-3" />
      Threshold Reached
    </Badge>
  );
}

/**
 * The "INFORM Act Compliance" detail card — status badge plus two progress
 * bars. Rendered lower on the Finances page, wrapped with `id="inform"` so
 * `/admin/finances#inform` deep-links here.
 */
export function InformComplianceCard({
  inform,
  stripeDetailsSubmitted,
}: InformComplianceProps) {
  const transactionPct = Math.min(
    (inform.annualTransactions / INFORM_TRANSACTION_THRESHOLD) * 100,
    100,
  );
  const revenuePct = Math.min(
    (inform.annualRevenueCents / INFORM_REVENUE_THRESHOLD_CENTS) * 100,
    100,
  );

  return (
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
          <ComplianceBadge
            thresholdReached={inform.thresholdReached}
            stripeDetailsSubmitted={stripeDetailsSubmitted}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Annual Transactions</span>
            <span className="font-medium">
              {inform.annualTransactions.toLocaleString()} /{" "}
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
              {formatCurrency(inform.annualRevenueCents)} / $5,000
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
          including any later refunded or disputed). Thresholds trigger when
          either condition is met.{" "}
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
  );
}
