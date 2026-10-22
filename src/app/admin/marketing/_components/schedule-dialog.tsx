"use client";

import { useId, useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";

import { addCalendarDays, zonedCalendarDate } from "~/lib/calendar-date";
import { parseZonedDateTime } from "~/lib/events/normalize";
import { getTimeZoneLabel } from "~/lib/time-zones";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import { formatCampaignInstant, pluralize } from "../_lib/format";
import { PlaceholderNote } from "./placeholder-note";

// Mirrors scheduleCampaign's window (src/server/api/routers/marketing.ts).
const MIN_LEAD_MS = 10 * 60_000;
const MAX_AHEAD_MS = 90 * 24 * 60 * 60_000;

/** "00:00", "00:15", … "23:45" with a 12-hour label. */
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const label = `${hours % 12 === 0 ? 12 : hours % 12}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
  return { value, label };
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The store's IANA time zone (`Business.timeZone`). */
  timeZone: string;
  /** Owner-facing audience description, e.g. "All subscribers". */
  audienceLabel: string;
  /** Current audience size, or null while unknown. */
  count: number | null;
  /** Leftover "[placeholder]" snippets in the email (a non-blocking note). */
  placeholders?: string[];
  /** True while the draft is being saved / scheduled. */
  pending: boolean;
  /** Server error from the last attempt. */
  error: string | null;
  onConfirm: (scheduledAt: Date) => void;
};

/**
 * Pick a send time in the STORE's time zone (not the browser's). The date is
 * a native date input, the time a 15-minute-step select; both are read as a
 * wall clock in `timeZone` and converted to an instant with
 * `parseZonedDateTime` (DST-safe).
 */
export function ScheduleDialog({ open, onOpenChange, ...rest }: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Don't let a stray click away interrupt a save in flight.
        if (!next && rest.pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        {/* Mounted only while open, so "now" and the defaults are fresh. */}
        {open && (
          <ScheduleBody {...rest} onCancel={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ScheduleBody({
  timeZone,
  audienceLabel,
  count,
  placeholders = [],
  pending,
  error,
  onConfirm,
  onCancel,
}: Omit<Props, "open" | "onOpenChange"> & { onCancel: () => void }) {
  const uid = useId();
  const [now] = useState(() => Date.now());
  const minMs = now + MIN_LEAD_MS;
  const maxMs = now + MAX_AHEAD_MS;
  const minDate = zonedCalendarDate(new Date(minMs), timeZone);
  const maxDate = zonedCalendarDate(new Date(maxMs), timeZone);

  const [date, setDate] = useState(() =>
    addCalendarDays(zonedCalendarDate(new Date(now), timeZone), 1),
  );
  const [time, setTime] = useState("09:00");

  const instantFor = (d: string, t: string): Date | null => {
    if (!d) return null;
    try {
      const value = parseZonedDateTime(`${d}T${t}`, timeZone);
      return Number.isNaN(value.getTime()) ? null : value;
    } catch {
      return null;
    }
  };
  const outOfRange = (value: Date | null) =>
    !value || value.getTime() < minMs || value.getTime() > maxMs;

  const selected = instantFor(date, time);
  const valid = !outOfRange(selected);
  const rangeError =
    selected && selected.getTime() < minMs
      ? "Pick a time at least 10 minutes from now."
      : selected && selected.getTime() > maxMs
        ? "Pick a time within the next 90 days."
        : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Schedule this campaign</DialogTitle>
        <DialogDescription>
          Choose when it should go out. Until then it&apos;s locked; you can
          unschedule it to make changes.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${uid}-date`}>Date</Label>
            <Input
              id={`${uid}-date`}
              type="date"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={(event) => setDate(event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${uid}-time`}>Time</Label>
            <Select value={time} onValueChange={setTime} disabled={pending}>
              <SelectTrigger id={`${uid}-time`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {TIME_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={outOfRange(instantFor(date, option.value))}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-muted-foreground text-xs">
          Times are in {getTimeZoneLabel(timeZone)} ({timeZone}), your
          store&apos;s time zone.
        </p>

        {rangeError && (
          <p role="alert" className="text-destructive text-sm">
            {rangeError}
          </p>
        )}

        {valid && selected && (
          <p className="text-sm" aria-live="polite">
            Sends within about 15 minutes of{" "}
            <span className="font-medium">
              {formatCampaignInstant(selected, timeZone)}
            </span>
            {count !== null && (
              <>
                {" "}
                to ≈{count.toLocaleString()}{" "}
                {pluralize(count, "person", "people")}
              </>
            )}{" "}
            ({audienceLabel}).
          </p>
        )}

        <PlaceholderNote placeholders={placeholders} />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!valid || pending}
          onClick={() => selected && onConfirm(selected)}
        >
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <CalendarClock className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Schedule campaign
        </Button>
      </DialogFooter>
    </>
  );
}
