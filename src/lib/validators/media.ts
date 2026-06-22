import { z } from "zod";

/**
 * Optional `businessId` — honored only when the caller is a PLATFORM_ADMIN.
 * Non-platform-admins are silently scoped to their own business.
 */
export const mediaListInput = z.object({
  businessId: z.string().optional(),
});

export const mediaDeleteInput = z.object({
  key: z.string().min(1),
  businessId: z.string().optional(),
});

export const mediaDownloadInput = z.object({
  key: z.string().min(1),
  businessId: z.string().optional(),
});
