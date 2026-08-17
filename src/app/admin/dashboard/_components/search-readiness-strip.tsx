import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type {
  BusinessForScorecard,
  SiteContentForScorecard,
} from "~/lib/seo/scorecard";
import { computeSeoScorecard } from "~/lib/seo/scorecard";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";

import { HideSearchReadinessButton } from "./hide-search-readiness-button";

/**
 * "Search readiness N%" teaser for the dashboard — the compact counterpart to
 * the full report on /admin/content/seo.
 *
 * Async server component rendered inside its own `<Suspense fallback={null}>`
 * by the dashboard page (same treatment as `ConversionCard`), so its ~20 counts
 * never delay first paint.
 *
 * Takes already-fetched rows: the dashboard has the business and the widened
 * `siteContent` select in hand, and refetching them here would be pure waste.
 * `isEnabled` arrives as a function, which is fine — this is a server component,
 * so its props are resolved during the server render and never serialized.
 *
 * Hides itself at 100%, the same way `setupProgress` goes null once onboarding
 * is finished: a permanent "you're done" banner is just clutter. Also is not
 * rendered at all when the owner turns off the `dashboardSearchReadiness` flag
 * (gated in `page.tsx`); an inline Hide button flips that flag.
 */
export async function SearchReadinessStrip({
  businessId,
  isEnabled,
  business,
  siteContent,
}: {
  businessId: string;
  isEnabled: (key: string) => boolean;
  business: BusinessForScorecard;
  siteContent: SiteContentForScorecard | null | undefined;
}) {
  const scorecard = await computeSeoScorecard({
    businessId,
    isEnabled,
    business,
    siteContent,
  });

  if (scorecard.percent >= 100) return null;

  return (
    <Card className="mb-6">
      <CardContent className="flex flex-col gap-4 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between gap-4 sm:justify-start">
            <h2 className="text-foreground text-sm font-semibold">
              Search readiness
            </h2>
            <span className="text-muted-foreground text-xs tabular-nums">
              {scorecard.percent}%
            </span>
          </div>
          <Progress
            value={scorecard.percent}
            className="mt-2 h-1.5 max-w-sm"
            aria-label={`Search readiness: ${scorecard.percent}%`}
          />
          {scorecard.next ? (
            <p className="text-muted-foreground mt-2 text-sm">
              Next: {scorecard.next.label}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <HideSearchReadinessButton />
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/content/seo">
              Improve search results
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
