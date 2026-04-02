import { z } from "zod";

export const generalBusinessFormSchema = z.object({
  name: z.string().min(1),
  ownerEmail: z.string().email(),
  supportEmail: z.string().email(),
  businessAddress: z.string().optional().nullable().or(z.literal("")),
  taxId: z.string().optional().nullable().or(z.literal("")),
  slug: z.string().min(1),
  phoneNumber: z.string().optional().nullable().or(z.literal("")),
});

export type GeneralBusinessFormSchema = z.infer<
  typeof generalBusinessFormSchema
>;
