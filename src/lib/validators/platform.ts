import { z } from "zod";

// Mirrors the role constraints on `platform.createBusiness` /
// `platform.createMembership` / `platform.updateMembership` in
// `src/server/api/routers/platform.ts` — keep in sync.

export const createBusinessFormSchema = z.object({
  name: z
    .string()
    .min(1, "Business name is required")
    .max(100, "Business name must be 100 characters or fewer"),
  subdomain: z
    .string()
    .min(3, "Subdomain must be at least 3 characters")
    .max(63, "Subdomain must be 63 characters or fewer")
    .regex(
      /^[a-z0-9-]+$/,
      "Subdomain may only contain lowercase letters, numbers, and hyphens",
    ),
  templateId: z.string().min(1),
  ownerEmail: z
    .string()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
});

export type CreateBusinessFormData = z.infer<typeof createBusinessFormSchema>;

export const addMemberFormSchema = z.object({
  userId: z.string().min(1, "Please select a user"),
  role: z.enum(["OWNER", "MANAGER"]),
});

export type AddMemberFormData = z.infer<typeof addMemberFormSchema>;

export const addMembershipFormSchema = z.object({
  businessId: z.string().min(1, "Please select a business"),
  role: z.enum(["OWNER", "MANAGER", "STAFF"]),
});

export type AddMembershipFormData = z.infer<typeof addMembershipFormSchema>;

export const editMembershipFormSchema = z.object({
  role: z.enum(["OWNER", "MANAGER", "STAFF"]),
});

export type EditMembershipFormData = z.infer<typeof editMembershipFormSchema>;
