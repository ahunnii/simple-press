import { z } from "zod";

import { isValidTimeZone } from "~/lib/time-zones";

export const generalBusinessFormSchema = z.object({
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
  slug: z.string().min(1),
  phoneNumber: z.string().optional().nullable().or(z.literal("")),
  sendAbandonedCheckoutEmails: z.boolean(),
  timeZone: z
    .string()
    .refine(isValidTimeZone, { message: "Unknown time zone" }),
});

export type GeneralBusinessFormSchema = z.infer<
  typeof generalBusinessFormSchema
>;
