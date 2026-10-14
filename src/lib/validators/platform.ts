import { z } from "zod";

import {
  BUSINESS_TYPE_IDS,
  SETUP_STEP_KEYS,
  SETUP_STEP_LEVELS,
} from "~/lib/admin/setup-plan";

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
  businessType: z.enum(BUSINESS_TYPE_IDS),
  setupSteps: z.record(z.enum(SETUP_STEP_KEYS), z.enum(SETUP_STEP_LEVELS)),
  // The dialog's TYPE_RELEVANT_FEATURES switches, full values (not overrides)
  // — the submit handler diffs them against registry defaults.
  featureFlags: z.record(z.string(), z.boolean()),
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

export const updateBusinessBasicsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Business name is required")
    .max(100, "Business name must be 100 characters or fewer"),
  ownerEmail: z
    .string()
    .trim()
    .min(1, "Owner email is required")
    .email("Enter a valid email address"),
  supportEmail: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal(""))
    .nullable(),
});

export type UpdateBusinessBasicsFormData = z.infer<
  typeof updateBusinessBasicsSchema
>;
