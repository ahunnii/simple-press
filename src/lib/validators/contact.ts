import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  subject: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
  phone: z.string().optional(),
  preferredContactMethod: z
    .enum(["email", "phone", "no-preference"])
    .optional(),
  captchaToken: z.string(),
});

export type ContactFormData = z.infer<typeof contactSchema>;

/**
 * Form schema for contact forms (no captchaToken; added at submit).
 * Optional messageMaxLength enforces a max length on the message field.
 */
export function contactFormSchema(messageMaxLength?: number) {
  return z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    message:
      messageMaxLength != null
        ? z
            .string()
            .min(10, "Message must be at least 10 characters")
            .max(
              messageMaxLength,
              `Message must be at most ${messageMaxLength} characters`,
            )
        : z.string().min(10, "Message must be at least 10 characters"),
    preferredContactMethod: z
      .enum(["email", "phone", "no-preference"])
      .default("no-preference"),
  });
}

export type ContactFormValues = {
  name: string;
  email: string;
  phone?: string;
  message: string;
  preferredContactMethod: "email" | "phone" | "no-preference";
};
