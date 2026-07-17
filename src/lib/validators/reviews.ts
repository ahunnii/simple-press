import { z } from "zod";

/**
 * Form schema for the owner-review dialog (admin/reviews). Mirrors the
 * constraints on `review.ownerCreate` / `review.ownerUpdate` in
 * `src/server/api/routers/review.ts`. The same shape is used for both
 * create and edit — on edit the full form is still submitted (not a partial
 * patch), so the stricter create-side constraints apply in both cases.
 *
 * `productId` is only shown/editable on create (the product a review
 * belongs to can't be changed once created), but stays in the schema so the
 * form type is uniform; on edit it's seeded from the existing review and
 * simply omitted from the update payload.
 */
export const ownerReviewFormSchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  customerName: z.string().trim().min(1, "Reviewer name is required"),
  customerEmail: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  customerTitle: z.string().trim().optional().or(z.literal("")),
  rating: z
    .number({ invalid_type_error: "Rating is required" })
    .int()
    .min(1, "Rating is required")
    .max(5, "Rating must be between 1 and 5"),
  title: z.string().trim().optional().or(z.literal("")),
  comment: z.string().trim().min(1, "Review text is required"),
  verifiedPurchase: z.boolean(),
  isApproved: z.boolean(),
  reviewDate: z.string().min(1, "Review date is required"),
});

export type OwnerReviewFormData = z.infer<typeof ownerReviewFormSchema>;
