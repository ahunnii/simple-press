import { AlertTriangle } from "lucide-react";

import { api } from "~/trpc/server";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

import { TrailHeader } from "../_components/trail-header";
import { AnalyticsContent } from "./_components/analytics-content";
import { RangeSelector } from "./_components/range-selector";

type Range = "7d" | "30d" | "90d";

const VALID_RANGES: Range[] = ["7d", "30d", "90d"];

function parseRange(raw: string | undefined): Range {
  if (raw && (VALID_RANGES as string[]).includes(raw)) {
    return raw as Range;
  }
  return "30d";
}

type Props = {
  searchParams: Promise<{ range?: string }>;
};

export default async function AnalyticsPage({ searchParams }: Props) {
  const params = await searchParams;
  const range = parseRange(params.range);

  // Promise.allSettled (not Promise.all) so a single failing Umami call
  // (outage, misconfiguration, network error) can't throw and crash the
  // whole /admin/analytics server component — each failed section falls
  // back to its existing "not configured" empty state, and a banner above
  // explains that it's a temporary data issue rather than a setup problem.
  const [
    overviewResult,
    topPagesResult,
    topReferrersResult,
    eventsResult,
    embedEngagementResult,
  ] = await Promise.allSettled([
    api.analytics.overview({ range }),
    api.analytics.topPages({ range }),
    api.analytics.topReferrers({ range }),
    api.analytics.events({ range }),
    api.analytics.embedEngagement({ range }),
  ]);

  const hasError = [
    overviewResult,
    topPagesResult,
    topReferrersResult,
    eventsResult,
    embedEngagementResult,
  ].some((r) => r.status === "rejected");

  const overview =
    overviewResult.status === "fulfilled"
      ? overviewResult.value
      : { configured: false as const };
  const topPages =
    topPagesResult.status === "fulfilled"
      ? topPagesResult.value
      : { configured: false as const };
  const topReferrers =
    topReferrersResult.status === "fulfilled"
      ? topReferrersResult.value
      : { configured: false as const };
  const events =
    eventsResult.status === "fulfilled"
      ? eventsResult.value
      : { configured: false as const };
  const embedEngagement =
    embedEngagementResult.status === "fulfilled"
      ? embedEngagementResult.value
      : { configured: false as const };

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Analytics" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Analytics</h1>
            <p>Visitor and traffic data for your storefront</p>
          </div>
          <RangeSelector current={range} />
        </div>

        {hasError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Analytics data unavailable</AlertTitle>
            <AlertDescription>
              We couldn&apos;t load some analytics data right now. This is
              usually a temporary issue with the Umami connection — try
              refreshing in a few minutes. If it persists, check your Umami
              configuration in Settings → Integrations.
            </AlertDescription>
          </Alert>
        )}

        <AnalyticsContent
          overview={overview}
          topPages={topPages}
          topReferrers={topReferrers}
          events={events}
          embedEngagement={embedEngagement}
        />
      </div>
    </>
  );
}

export const metadata = {
  title: "Analytics",
};
