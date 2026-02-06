import { z } from "zod";

export const newsletterSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

export type NewsletterFormData = z.infer<typeof newsletterSchema>;
