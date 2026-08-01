import { z } from "zod";

import { isValidTimeZone } from "~/lib/time-zones";

export const generalBusinessFormSchema = z.object({
  name: z.string().min(1),
  ownerEmail: z.string().email(),
  supportEmail: z.string().email(),
  businessAddress: z.string().optional().nullable().or(z.literal("")),
  slug: z.string().min(1),
  phoneNumber: z.string().optional().nullable().or(z.literal("")),
  sendAbandonedCheckoutEmails: z.boolean(),
  timeZone: z.string().refine(isValidTimeZone, { message: "Unknown time zone" }),
});

export type GeneralBusinessFormSchema = z.infer<
  typeof generalBusinessFormSchema
>;
