import { z } from "zod";

export const generalBusinessFormSchema = z.object({
  name: z.string().min(1),
  ownerEmail: z.string().email(),
  supportEmail: z.string().email().optional(),
  businessAddress: z.string().optional(),
  taxId: z.string().optional(),
  slug: z.string().min(1),
});

export type GeneralBusinessFormSchema = z.infer<
  typeof generalBusinessFormSchema
>;
