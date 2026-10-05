import type { ReactNode } from "react";

import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatDateTime(value: Date | null): string {
  return value ? dateTimeFormatter.format(value) : "—";
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
        {label}
      </dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

export async function BusinessHealthCard({
  businessId,
}: {
  businessId: string;
}) {
  const overview = await api.platformBusiness.getOverview({ businessId });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Stat label="Stripe">
            {!overview.stripeConnected ? (
              <Badge variant="secondary">Not connected</Badge>
            ) : overview.stripeChargesEnabled ? (
              <Badge variant="success">Connected</Badge>
            ) : (
              <Badge variant="warning">Charges disabled</Badge>
            )}
          </Stat>
          <Stat label="Payouts">
            {!overview.stripeConnected ? (
              "—"
            ) : overview.stripePayoutsEnabled ? (
              <Badge variant="success">Enabled</Badge>
            ) : (
              <Badge variant="warning">Disabled</Badge>
            )}
          </Stat>
          <Stat label="Products">{overview.productCount}</Stat>
          <Stat label="Orders">{overview.orderCount}</Stat>
          <Stat label="Last order">{formatDateTime(overview.lastOrderAt)}</Stat>
          <Stat label="Open editor notes">{overview.openEditorNotes}</Stat>
        </dl>
      </CardContent>
    </Card>
  );
}
