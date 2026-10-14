"use client";

import { useEffect, useState } from "react";

import {
  invoiceEventLabel,
  metadataSummary,
} from "~/lib/invoices/event-format";

import { formatInstant, formatRelativeTime } from "./format";

export type InvoiceActivityRow = {
  id: string;
  createdAt: Date;
  type: string;
  actorUserId: string | null;
  metadata: unknown;
};

type Props = {
  events: InvoiceActivityRow[];
  timeZone: string;
};

/**
 * Absolute time always (so server and client render the identical string on
 * first paint), swapped for a relative label once mounted — computing
 * "3 minutes ago" during SSR would disagree with the client's clock and trip
 * a hydration mismatch.
 */
export function EventTime({
  date,
  timeZone,
}: {
  date: Date;
  timeZone: string;
}) {
  const absolute = formatInstant(date, timeZone);
  const [relative, setRelative] = useState<string | null>(null);

  useEffect(() => {
    setRelative(formatRelativeTime(date, new Date()));
  }, [date]);

  return (
    <time
      dateTime={date.toISOString()}
      title={absolute}
      className="tabular-nums"
    >
      {relative ?? absolute}
    </time>
  );
}

export function InvoiceActivity({ events, timeZone }: Props) {
  if (events.length === 0) {
    return <p className="text-muted-foreground text-sm">No activity yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {events.map((event) => {
        const label = invoiceEventLabel(event.type);
        const summary = metadataSummary(event.metadata);

        return (
          <li key={event.id} className="flex gap-3">
            <div className="mt-1.5 size-2 shrink-0 rounded-full bg-neutral-400" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{label}</p>
              {summary.length > 0 && (
                <p className="text-muted-foreground text-sm">
                  {summary.join(" · ")}
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                <EventTime date={event.createdAt} timeZone={timeZone} />
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
