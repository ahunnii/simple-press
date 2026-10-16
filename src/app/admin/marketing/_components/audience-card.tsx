import { Users } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

import { pluralize } from "../_lib/format";
import { ExportRecipientsButton } from "./export-recipients-button";

type Props = {
  count: number;
  suppressedCount: number;
};

/** Who a campaign would go to right now, plus the CSV export. */
export function AudienceCard({ count, suppressedCount }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Users className="text-muted-foreground h-4 w-4" aria-hidden="true" />
          Audience
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm tabular-nums">
              {count.toLocaleString()}
            </Badge>
            <span className="text-muted-foreground text-sm">
              {pluralize(count, "customer")} opted in to marketing emails
            </span>
          </div>
          <ExportRecipientsButton disabled={count === 0} />
        </div>
        {suppressedCount > 0 && (
          <p className="text-muted-foreground mt-3 text-sm">
            {suppressedCount.toLocaleString()} suppressed (bounced or marked as
            spam). We don&apos;t email these customers, so they aren&apos;t
            counted above.
          </p>
        )}
        {count === 0 && (
          <p className="text-muted-foreground mt-3 text-sm">
            No customers have opted in yet. Customers join by ticking the
            marketing box at checkout, signing up through the newsletter form
            on your site (they confirm by email), or in their account
            preferences.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
