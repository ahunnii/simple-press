import { z } from "zod";

import { eventCutoff } from "~/lib/events/format";
import {
  ADMIN_BULK_DELETE_LIMIT,
  ADMIN_BULK_SELECTION_LIMIT,
} from "~/lib/validators/admin-table";

// ─── Event ────────────────────────────────────────────────────────────────

// "YYYY-MM-DD" (all-day) or "YYYY-MM-DDTHH:mm" (timed) — the exact shapes
// `<input type="date">` / `<input type="datetime-local">` produce. Seconds are
// intentionally not accepted here: the admin form never sends them, unlike
// `parseZonedDateTime` in src/lib/events/normalize.ts, which also has to parse
// the internal 23:59:59.999 all-day pin.
const LOCAL_DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

const localDateTime = z
  .string()
  .trim()
  .regex(LOCAL_DATE_TIME_RE, "Enter a valid date or date & time");

/**
 * `endAt >= startAt`, compared as plain strings. This is only correct because
 * both fields are fixed-width, zero-padded "YYYY-MM-DD"/"YYYY-MM-DDTHH:mm"
 * values — lexicographic order and chronological order coincide for that exact
 * shape (same reasoning as ISO 8601 sort-ability). Do not reuse this compare on
 * any other date format.
 */
function endAtNotBeforeStartAt(data: {
  startAt: string;
  endAt?: string | null;
}): boolean {
  if (!data.endAt) return true;
  return data.endAt >= data.startAt;
}

const DATE_ORDER_ISSUE: { message: string; path: (string | number)[] } = {
  message: "End must be on or after the start.",
  path: ["endAt"],
};

// Zod: a `.refine()` result (ZodEffects) cannot be `.extend()`ed, so the plain
// object schema is declared first and the refinement is applied separately to
// each schema derived from it (eventFormSchema, eventCreateSchema,
// eventUpdateSchema) rather than chained once up front.
const eventFormObjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be 120 characters or fewer"),
  blurb: z
    .string()
    .max(2000, "Blurb must be 2000 characters or fewer")
    .optional()
    .nullable(),
  coverImage: z.string().url().optional().nullable(),
  startAt: localDateTime,
  endAt: localDateTime.optional().nullable(),
  allDay: z.boolean().default(false),
  location: z
    .string()
    .max(200, "Location must be 200 characters or fewer")
    .optional()
    .nullable(),
  // Owners clear this by emptying the input, so "" is accepted on the wire and
  // normalized to null rather than rejected as an invalid URL.
  externalUrl: z
    .union([z.string().trim().url("Enter a valid URL"), z.literal("")])
    .optional()
    .nullable()
    .transform((value) => {
      // Deliberately a truthiness check, not `??` — "" must normalize to
      // null here too, and `??` only catches null/undefined.
      if (!value) return null;
      return value;
    }),
  externalUrlLabel: z
    .string()
    .max(60, "Link label must be 60 characters or fewer")
    .optional()
    .nullable(),
  priceLabel: z
    .string()
    .max(60, "Price label must be 60 characters or fewer")
    .optional()
    .nullable(),
  published: z.boolean().default(true),
});

export const eventFormSchema = eventFormObjectSchema.refine(
  endAtNotBeforeStartAt,
  DATE_ORDER_ISSUE,
);

export type EventFormData = z.infer<typeof eventFormSchema>;

export const eventCreateSchema = eventFormObjectSchema.refine(
  endAtNotBeforeStartAt,
  DATE_ORDER_ISSUE,
);

export const eventUpdateSchema = eventFormObjectSchema
  .extend({ id: z.string() })
  .refine(endAtNotBeforeStartAt, DATE_ORDER_ISSUE);

export type EventCreateData = z.infer<typeof eventCreateSchema>;
export type EventUpdateData = z.infer<typeof eventUpdateSchema>;

// ─── Archive ──────────────────────────────────────────────────────────────

export const eventArchiveSchema = z.object({
  id: z.string(),
  isArchived: z.boolean(),
});

export type EventArchiveData = z.infer<typeof eventArchiveSchema>;

// ─── Admin table: filter/sort vocabulary ───────────────────────────────────

/**
 * The accepted values for the admin Events list's filter and sort params.
 *
 * These live here, outside both the router and the page, because they are
 * one contract with two halves that fail differently when they drift — same
 * hazard as the Discounts and Reviews lists (see `src/lib/validators/discounts.ts`
 * and `src/lib/validators/reviews.ts`), and the same shape of consumer:
 * `events.getAll` is an **in-memory** pipeline (input-free, filtered/sorted/
 * paginated on the page via `buildTablePage`), so there is no router `z.enum`
 * to keep in sync here. The two halves are the page's own `pickParam` calls
 * and the `FilterDefFor` option lists that render the filter/sort dropdowns:
 *
 * - An option the dropdown offers that `pickParam` doesn't recognize against
 *   these tuples is a **silent** failure: `pickParam` falls back to the
 *   default, so the control appears selected while the underlying rows are
 *   unfiltered/unsorted.
 * - A dropdown option with no matching `case` in the page's `comparePrimary`
 *   switch or filter predicate is also **silent** — it falls through to the
 *   `default` branch instead of crashing, so a typo just quietly reverts to
 *   the default sort/filter instead of surfacing as an error.
 *
 * One `as const` tuple per param, consumed by `pickParam` and the
 * `AdminFilterDef` option lists on the page, keeps both in sync. Tuple order
 * is menu order — `FilterDefFor` maps each tuple positionally into the
 * dropdown's option list.
 */

export const EVENT_WHEN_VALUES = ["all", "upcoming", "past"] as const;
export const EVENT_WHEN_DEFAULT = "all";
export type EventWhenValue = (typeof EVENT_WHEN_VALUES)[number];
export type EventWhen = Exclude<EventWhenValue, "all">;

export const EVENT_STATUS_VALUES = [
  "all",
  "published",
  "draft",
  "archived",
] as const;
export const EVENT_STATUS_DEFAULT = "all";
export type EventStatusValue = (typeof EVENT_STATUS_VALUES)[number];
export type EventStatus = Exclude<EventStatusValue, "all">;

export const EVENT_SORT_VALUES = [
  "latest",
  "soonest",
  "newest",
  "oldest",
  "name-asc",
  "name-desc",
] as const;
// "latest" (startAt descending) rather than "soonest": the default view shows
// ALL events, and startAt-ascending would lead page 1 with the oldest past
// events once history accumulates. Descending keeps upcoming events on page 1
// and lets past ones sink.
export const EVENT_SORT_DEFAULT = "latest";
export type EventSortValue = (typeof EVENT_SORT_VALUES)[number];

// ─── Admin table: derivations ───────────────────────────────────────────────

/**
 * Whether an event is over, for the admin list's When filter/badge.
 *
 * Cron-lag aware: `archivePastEvents` (src/lib/events/archive.ts) flips
 * `isArchived` on a ~15-minute cadence, so a just-ended event can be
 * `isArchived: false` with a cutoff already in the past. Strict `<` matches
 * the cron sweep's `lt` (`pastEventWhere` in src/lib/events/query.ts) — an
 * event whose cutoff equals `now` exactly is still upcoming.
 */
export function isEventPast(
  e: { startAt: Date; endAt: Date | null; allDay: boolean; isArchived: boolean },
  now: Date,
): boolean {
  return e.isArchived || eventCutoff(e).getTime() < now.getTime();
}

/**
 * The single When derivation for the admin Events list — the filter
 * predicate and the (implicit, via `isEventPast`) date badge must never
 * disagree. Only two values exist ("upcoming" ∩ "archived" is empty by
 * construction): a manually-archived future event is deliberately reported
 * as "past" so it stays out of the Upcoming view, matching the old Upcoming
 * tab's exclusion of archived rows (`events-client.tsx`'s mirror test case).
 */
export function getEventWhen(
  e: { startAt: Date; endAt: Date | null; allDay: boolean; isArchived: boolean },
  now: Date,
): EventWhen {
  return isEventPast(e, now) ? "past" : "upcoming";
}

/**
 * The single status derivation for the whole admin Events list. Used by
 * every consumer that must never disagree: the list page's status filter
 * predicate and the table row's status badge.
 *
 * Priority is **archived ▸ draft ▸ published**, checked in that order —
 * archived outranks draft/published even when `published` is still `true`
 * (Reviews precedent: hidden outranks approved).
 *
 * This reads the mechanical flags only, NOT the cutoff — a just-ended event
 * keeps its Published badge until the cron sweep archives it, matching the
 * old UI's badge behavior. `isEventPast`/`getEventWhen` above are the only
 * cutoff-aware derivations; this one deliberately is not.
 */
export function getEventStatus(e: {
  published: boolean;
  isArchived: boolean;
}): EventStatus {
  if (e.isArchived) return "archived";
  if (!e.published) return "draft";
  return "published";
}

// ─── Admin table: bulk schemas ─────────────────────────────────────────────

// Caps come from ~/lib/validators/admin-table, shared with the other admin
// list bulk actions — delete is far lower than publish/archive on purpose.
export const eventBulkPublishSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one event id is required")
    .max(
      ADMIN_BULK_SELECTION_LIMIT,
      `Too many events selected — publish or unpublish at most ${ADMIN_BULK_SELECTION_LIMIT} at a time`,
    ),
  published: z.boolean(),
});

export const eventBulkArchiveSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one event id is required")
    .max(
      ADMIN_BULK_SELECTION_LIMIT,
      `Too many events selected — archive or unarchive at most ${ADMIN_BULK_SELECTION_LIMIT} at a time`,
    ),
  isArchived: z.boolean(),
});

export const eventBulkDeleteSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one event id is required")
    .max(
      ADMIN_BULK_DELETE_LIMIT,
      `Too many events selected — delete at most ${ADMIN_BULK_DELETE_LIMIT} at a time`,
    ),
});
