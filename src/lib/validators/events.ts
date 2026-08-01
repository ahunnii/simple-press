import { z } from "zod";

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

// ─── Reorder / archive ────────────────────────────────────────────────────

export const eventReorderSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one event id is required")
    .max(500, "Too many events selected"),
});

export type EventReorderData = z.infer<typeof eventReorderSchema>;

export const eventArchiveSchema = z.object({
  id: z.string(),
  isArchived: z.boolean(),
});

export type EventArchiveData = z.infer<typeof eventArchiveSchema>;
