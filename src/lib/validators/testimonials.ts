import { z } from "zod";

/**
 * Form schema for the owner-testimonial dialog (admin/testimonials). Mirrors
 * the constraints on `testimonial.ownerCreate` / `testimonial.ownerUpdate`
 * in `src/server/api/routers/testimonials.ts`. The same shape is used for
 * both create and edit — on edit the full form is still submitted (not a
 * partial patch), so the stricter create-side constraints apply in both
 * cases.
 */
export const ownerTestimonialFormSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, "Customer name is required")
    .max(200, "Customer name must be 200 characters or fewer"),
  customerEmail: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  customerTitle: z
    .string()
    .trim()
    .max(200, "Customer title must be 200 characters or fewer")
    .optional()
    .or(z.literal("")),
  customerCompany: z
    .string()
    .trim()
    .max(200, "Customer company must be 200 characters or fewer")
    .optional()
    .or(z.literal("")),
  title: z
    .string()
    .trim()
    .max(300, "Headline must be 300 characters or fewer")
    .optional()
    .or(z.literal("")),
  text: z
    .string()
    .trim()
    .min(1, "Testimonial text is required")
    .max(5000, "Testimonial text must be 5000 characters or fewer"),
  photoUrls: z.array(z.string().url()).max(5, "Maximum 5 photos allowed"),
  isApproved: z.boolean(),
  testimonialDate: z.string().min(1, "Testimonial date is required"),
});

export type OwnerTestimonialFormData = z.infer<
  typeof ownerTestimonialFormSchema
>;
