import { z } from "zod";

import {
  isValidLatitude,
  isValidLongitude,
  parseCoordinate,
} from "~/lib/address/coordinates";
import { isValidTimeZone } from "~/lib/time-zones";

export const generalBusinessFormSchema = z
  .object({
    name: z.string().min(1),
    ownerEmail: z.string().email(),
    supportEmail: z.string().email(),
    addressStreet: z.string().optional().nullable().or(z.literal("")),
    addressCity: z.string().optional().nullable().or(z.literal("")),
    addressState: z
      .string()
      .min(2, "Use an abbreviation or full name (2+ characters)")
      .max(32, "Keep it under 32 characters")
      .optional()
      .nullable()
      .or(z.literal("")),
    addressPostalCode: z
      .string()
      .max(16, "Keep it under 16 characters")
      .optional()
      .nullable()
      .or(z.literal("")),
    // Map pin, entered as text so the field can be blank. Validated below
    // against `~/lib/address/coordinates`; parsed to `number | null` at
    // submit time in `general-settings.tsx`.
    latitude: z.string().optional().nullable().or(z.literal("")),
    longitude: z.string().optional().nullable().or(z.literal("")),
    slug: z.string().min(1),
    phoneNumber: z.string().optional().nullable().or(z.literal("")),
    sendAbandonedCheckoutEmails: z.boolean(),
    timeZone: z
      .string()
      .refine(isValidTimeZone, { message: "Unknown time zone" }),
  })
  .superRefine((data, ctx) => {
    const latRaw = data.latitude?.trim() ?? "";
    const lngRaw = data.longitude?.trim() ?? "";

    let latValid = true;
    let lngValid = true;

    if (latRaw) {
      const parsed = parseCoordinate(latRaw);
      if (!isValidLatitude(parsed)) {
        latValid = false;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Latitude must be between -90 and 90",
          path: ["latitude"],
        });
      }
    }

    if (lngRaw) {
      const parsed = parseCoordinate(lngRaw);
      if (!isValidLongitude(parsed)) {
        lngValid = false;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Longitude must be between -180 and 180",
          path: ["longitude"],
        });
      }
    }

    // Both-or-neither, but only worth flagging once each side is otherwise
    // valid — a malformed value already has its own error above.
    if (latValid && lngValid && !!latRaw !== !!lngRaw) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter both latitude and longitude, or leave both blank.",
        path: latRaw ? ["longitude"] : ["latitude"],
      });
    }
  });

export type GeneralBusinessFormSchema = z.infer<
  typeof generalBusinessFormSchema
>;
