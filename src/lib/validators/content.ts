import { z } from "zod";

export const siteContentSchema = z.object({
  templateId: z.string().optional(),
  // Hero Section
  heroTitle: z.string().optional(),
  heroSubtitle: z.string().optional(),
  heroImageUrl: z.string().url().optional().or(z.literal("")),
  heroButtonText: z.string().optional(),
  heroButtonLink: z.string().optional(),

  // About Section
  aboutTitle: z.string().optional(),
  aboutText: z.string().optional(),
  aboutImageUrl: z.string().url().optional().or(z.literal("")),

  // Features
  features: z.any().optional(), // JSON array

  // Footer
  footerText: z.string().optional(),
  socialLinks: z.any().optional(), // JSON object

  // SEO
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  ogImage: z.string().url().optional().or(z.literal("")),
  faviconUrl: z.string().url().optional().or(z.literal("")),

  // Logo
  logoUrl: z.string().url().optional().or(z.literal("")),
  logoAltText: z.string().optional(),

  // Colors
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),

  // Navigation
  navigationItems: z.any().optional(), // JSON array

  // Template-specific
  customFields: z.any().optional(), // JSON object
});

export const pageSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens"),
  content: z.any(),
  excerpt: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  ogImage: z.string().url().optional().or(z.literal("")),
  published: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  type: z.enum(["page", "policy", "custom"]).default("page"),
  template: z.enum(["default", "sidebar", "full-width"]).default("default"),
});
