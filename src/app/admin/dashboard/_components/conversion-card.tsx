import { MousePointerClick } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { getStats } from "~/lib/umami/client";

/**
 * Conversion rate (30d) stat card — paid orders ÷ unique visitors.
 *
 * Async server component, rendered inside its own <Suspense fallback={null}>
 * boundary from the dashboard page so a slow (or down) Umami server never
 * delays the rest of the dashboard.
 *
 * Degrades gracefully: the parent only renders this when the `analytics`
 * feature flag is on AND the business has umamiEnabled + a websiteId. On top
 * of that, `getStats` swallows Umami errors (Sentry-tagged) and returns
 * zeroed stats — and any zero-visitor result (including that failure path)
 * makes this component render nothing rather than a broken card.
 */
export async function ConversionCard({
  websiteId,
  paidOrders,
}: {
  websiteId: string;
  /** Paid order count over the same trailing 30-day window. */
  paidOrders: number;
}) {
  let visitors = 0;
  try {
    const endAt = Date.now();
    const startAt = endAt - 30 * 24 * 60 * 60 * 1000;
    const stats = await getStats({ websiteId, startAt, endAt });
    visitors = stats.visitors;
  } catch {
    // getStats already catches internally; this is belt-and-braces so an
    // unexpected throw can never crash the dashboard stream.
    return null;
  }

  if (visitors <= 0) {
    return null;
  }

  const rate = (paidOrders / visitors) * 100;
  const display = rate >= 1 ? rate.toFixed(1) : rate.toFixed(2);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          Conversion Rate
        </CardTitle>
        <MousePointerClick className="h-4 w-4 text-teal-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{display}%</div>
        <p className="text-muted-foreground mt-1 text-xs">
          {paidOrders} paid {paidOrders === 1 ? "order" : "orders"} /{" "}
          {visitors.toLocaleString()} visitors · 30 days
        </p>
      </CardContent>
    </Card>
  );
}
