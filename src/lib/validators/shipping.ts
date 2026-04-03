import { z } from "zod";

export const shippingFormSchema = z
  .object({
    shippingType: z.enum(["free", "flat_rate", "flat_rate_with_threshold"]),
    shippingFlatRateDollars: z.string().optional(),
    freeShippingThresholdDollars: z.string().optional(),
    offersInStorePickup: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (
      data.shippingType === "flat_rate" ||
      data.shippingType === "flat_rate_with_threshold"
    ) {
      const raw = data.shippingFlatRateDollars?.trim() ?? "";
      if (
        !raw ||
        Number.isNaN(Number.parseFloat(raw)) ||
        Number.parseFloat(raw) < 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid flat rate amount",
          path: ["shippingFlatRateDollars"],
        });
      }
    }
    if (data.shippingType === "flat_rate_with_threshold") {
      const raw = data.freeShippingThresholdDollars?.trim() ?? "";
      if (
        !raw ||
        Number.isNaN(Number.parseFloat(raw)) ||
        Number.parseFloat(raw) <= 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid free shipping threshold",
          path: ["freeShippingThresholdDollars"],
        });
      }
    }
  });

export type ShippingFormValues = z.infer<typeof shippingFormSchema>;
