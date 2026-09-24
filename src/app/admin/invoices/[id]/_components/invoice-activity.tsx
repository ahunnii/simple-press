"use client";

import { useEffect, useState } from "react";

import type { InvoiceEventType } from "~/lib/validators/invoice";
import { formatPrice } from "~/lib/prices";
import {
  INVOICE_EVENT_TYPE_LABELS,
  INVOICE_PAYMENT_RECORD_METHOD_LABELS,
} from "~/lib/validators/invoice";

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

function isKnownEventType(type: string): type is InvoiceEventType {
  return type in INVOICE_EVENT_TYPE_LABELS;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A short, best-effort gloss on an event's `metadata` — tolerant of any
 * shape, since these rows may come from data written by an earlier version
 * of the logger. Never includes anything sensitive: `logInvoiceEvent`
 * metadata is documented as non-sensitive-only, and this only reads keys that
 * match that contract.
 */
function metadataSummary(metadata: unknown): string[] {
  if (!isRecord(metadata)) return [];
  const parts: string[] = [];

  if (typeof metadata.amountCents === "number") {
    parts.push(formatPrice(metadata.amountCents));
  }
  if (typeof metadata.method === "string") {
    const labels: Record<string, string> = INVOICE_PAYMENT_RECORD_METHOD_LABELS;
    parts.push(labels[metadata.method] ?? metadata.method);
  }
  if (typeof metadata.to === "string") {
    parts.push(`to ${metadata.to}`);
  }
  if (typeof metadata.reminderCount === "number") {
    parts.push(`reminder #${metadata.reminderCount}`);
  }
  if (typeof metadata.notifyCustomer === "boolean") {
    parts.push(
      metadata.notifyCustomer ? "customer notified" : "customer not notified",
    );
  }
  if (typeof metadata.kind === "string") {
    parts.push(`(${metadata.kind})`);
  }
  return parts;
}

/**
 * Absolute time always (so server and client render the identical string on
 * first paint), swapped for a relative label once mounted — computing
 * "3 minutes ago" during SSR would disagree with the client's clock and trip
 * a hydration mismatch.
 */
function EventTime({ date, timeZone }: { date: Date; timeZone: string }) {
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
        const label = isKnownEventType(event.type)
          ? INVOICE_EVENT_TYPE_LABELS[event.type]
          : event.type;
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
