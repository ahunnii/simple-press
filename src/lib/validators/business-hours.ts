import { z } from "zod";

import { DAY_CODES } from "~/lib/business-hours";

// ─────────────────────────────────────────────────────────────────────────────
// Per-row schema
// ─────────────────────────────────────────────────────────────────────────────

export const businessHoursRowSchema = z
  .object({
    days: z
      .array(z.enum(DAY_CODES))
      .min(1, "Each row must include at least one day")
      .refine(
        (days) => new Set(days).size === days.length,
        "Days within a row must be unique",
      ),
    closed: z.boolean(),
    open: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Open time must be in HH:mm format")
      .nullable(),
    close: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Close time must be in HH:mm format")
      .nullable(),
  })
  .superRefine((row, ctx) => {
    if (!row.closed) {
      // Non-closed rows must have both open and close times
      if (!row.open) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Open time is required when the day is not closed",
          path: ["open"],
        });
      }
      if (!row.close) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Close time is required when the day is not closed",
          path: ["close"],
        });
      }
      // open must be strictly before close (string compare works for "HH:mm")
      if (row.open && row.close && row.open >= row.close) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Open time must be before close time",
          path: ["open"],
        });
      }
    }
    // When closed, open/close may be null — no additional checks needed
  });

// ─────────────────────────────────────────────────────────────────────────────
// Array-level schema — enforces no day appears in more than one row
// ─────────────────────────────────────────────────────────────────────────────

export const businessHoursSchema = z
  .array(businessHoursRowSchema)
  .superRefine((rows, ctx) => {
    const seen = new Map<string, number>(); // dayCode → first row index
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      for (const day of row.days) {
        const existingIdx = seen.get(day);
        if (existingIdx !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Day "${day}" appears in more than one row (rows ${existingIdx + 1} and ${i + 1})`,
            path: [i, "days"],
          });
        } else {
          seen.set(day, i);
        }
      }
    }
  });

export type BusinessHoursFormValues = z.infer<typeof businessHoursSchema>;
