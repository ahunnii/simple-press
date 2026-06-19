import { z } from "zod";

// ─── Service (broad service group) ───────────────────────────────────────────

export const serviceFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be 120 characters or fewer"),
  // slug is generated server-side from the name (see service router), so it is
  // intentionally not part of the form schema.
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or fewer")
    .optional()
    .nullable(),
  image: z.string().url().optional().nullable(),
  serviceTemplateId: z
    .string()
    .min(1, "A service page template is required")
    .default("service-one"),
  published: z.boolean().default(false),
  metaTitle: z
    .string()
    .max(70, "Meta title must be 70 characters or fewer")
    .optional()
    .nullable(),
  metaDescription: z
    .string()
    .max(200, "Meta description must be 200 characters or fewer")
    .optional()
    .nullable(),
  ogImage: z.string().url().optional().nullable(),
});

export type ServiceFormData = z.infer<typeof serviceFormSchema>;

export const serviceCreateSchema = serviceFormSchema;

export const serviceUpdateSchema = serviceFormSchema.extend({
  id: z.string(),
});

export type ServiceCreateData = z.infer<typeof serviceCreateSchema>;
export type ServiceUpdateData = z.infer<typeof serviceUpdateSchema>;

// ─── ServiceItem (specific bookable service) ──────────────────────────────────

export const serviceItemFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be 120 characters or fewer"),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or fewer")
    .optional()
    .nullable(),
  image: z.string().url().optional().nullable(),
  priceLabel: z
    .string()
    .max(60, "Price label must be 60 characters or fewer")
    .optional()
    .nullable(),
  durationLabel: z
    .string()
    .max(60, "Duration label must be 60 characters or fewer")
    .optional()
    .nullable(),
  // Raw embed input — bare URL or <iframe> snippet. Router sanitizes via parseEmbedInput.
  bookingEmbedSrc: z.string().optional().nullable(),
  bookingEmbedHeight: z
    .number()
    .int()
    .positive("Height must be a positive number")
    .optional()
    .nullable(),
  published: z.boolean().default(false),
});

export type ServiceItemFormData = z.infer<typeof serviceItemFormSchema>;

export const serviceItemCreateSchema = serviceItemFormSchema.extend({
  serviceId: z.string(),
});

export const serviceItemUpdateSchema = serviceItemFormSchema.extend({
  id: z.string(),
});

export const serviceItemDeleteSchema = z.object({
  id: z.string(),
});

export type ServiceItemCreateData = z.infer<typeof serviceItemCreateSchema>;
export type ServiceItemUpdateData = z.infer<typeof serviceItemUpdateSchema>;
export type ServiceItemDeleteData = z.infer<typeof serviceItemDeleteSchema>;

// ─── Reorder ─────────────────────────────────────────────────────────────────

export const serviceReorderSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one service id is required")
    .max(500, "Too many services selected"),
});

export const serviceItemReorderSchema = z.object({
  serviceId: z.string(),
  ids: z
    .array(z.string())
    .min(1, "At least one item id is required")
    .max(500, "Too many items selected"),
});

export type ServiceReorderData = z.infer<typeof serviceReorderSchema>;
export type ServiceItemReorderData = z.infer<typeof serviceItemReorderSchema>;

// ─── Custom fields ────────────────────────────────────────────────────────────

export const serviceCustomFieldsSchema = z.object({
  id: z.string(),
  customFields: z.record(z.string(), z.unknown()),
});

export type ServiceCustomFieldsData = z.infer<typeof serviceCustomFieldsSchema>;
