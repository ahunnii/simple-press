import { api } from "~/trpc/server";

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

  const [overview, topPages, topReferrers, events, embedEngagement] =
    await Promise.all([
      api.analytics.overview({ range }),
      api.analytics.topPages({ range }),
      api.analytics.topReferrers({ range }),
      api.analytics.events({ range }),
      api.analytics.embedEngagement({ range }),
    ]);

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
