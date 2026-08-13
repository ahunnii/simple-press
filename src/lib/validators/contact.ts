import { z } from "zod";

/**
 * Server-side caps for `contactSchema` below. `contact.send` (the tRPC
 * mutation these gate) is `publicProcedure` — reachable by a direct call that
 * never goes through the browser form, so without a `.max()` here an
 * unbounded string lands verbatim in an owner-delivered email
 * (`sendContactFormSubmission`, src/server/api/routers/contact.ts). The
 * client-side `contactFormSchema` below caps `message` too, but only via the
 * `messageMaxLength` each template passes in — it has no cap on `name`,
 * `subject` or `phone` at all. These constants are the floor every one of
 * those template caps must fit under.
 */
const CONTACT_NAME_MAX_LENGTH = 200;
const CONTACT_SUBJECT_MAX_LENGTH = 300;
// Matches the phone cap already used elsewhere for freeform phone input
// (~/lib/validators/order.ts).
const CONTACT_PHONE_MAX_LENGTH = 32;
/**
 * Must stay >= the largest per-template `messageMaxLength` passed to
 * `contactFormSchema` below (grep templates for `useContactForm({
 * messageMaxLength` — currently 600, from the pink template's contact and
 * table-request forms). A smaller server cap would reject a submission the
 * client-side form itself allowed through.
 */
const CONTACT_MESSAGE_MAX_LENGTH = 600;

export const contactSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(CONTACT_NAME_MAX_LENGTH, "Name is too long"),
  email: z.string().email("Invalid email"),
  subject: z
    .string()
    .max(CONTACT_SUBJECT_MAX_LENGTH, "Subject is too long")
    .optional(),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(CONTACT_MESSAGE_MAX_LENGTH, "Message is too long"),
  phone: z
    .string()
    .max(CONTACT_PHONE_MAX_LENGTH, "Phone number is too long")
    .optional(),
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
