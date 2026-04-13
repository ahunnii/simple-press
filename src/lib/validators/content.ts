import { z } from "zod";

const socialLinksSchema = z
  .object({
    instagram: z.string().url().optional().nullable().or(z.literal("")),
    facebook: z.string().url().optional().nullable().or(z.literal("")),
    twitter: z.string().url().optional().nullable().or(z.literal("")),
    linkedin: z.string().url().optional().nullable().or(z.literal("")),
    tiktok: z.string().url().optional().nullable().or(z.literal("")),
  })
  .optional();

const navigationItemsSchema = z
  .array(
    z.object({
      label: z.string().max(100),
      href: z.string().max(500),
    }),
  )
  .optional();

export const siteContentSchema = z.object({
  templateId: z.string().optional(),
  // Hero Section
  heroTitle: z.string().max(255).optional(),
  heroSubtitle: z.string().max(500).optional(),
  heroImageUrl: z.string().url().optional().or(z.literal("")),
  heroButtonText: z.string().max(100).optional(),
  heroButtonLink: z.string().max(500).optional(),

  // About Section
  aboutTitle: z.string().max(255).optional(),
  aboutText: z.string().max(10000).optional(),
  aboutImageUrl: z.string().url().optional().or(z.literal("")),

  // Features
  features: z.any().optional(), // JSON array — shape varies per template

  // Footer
  footerText: z.string().max(500).optional(),
  socialLinks: socialLinksSchema,

  // SEO
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
  metaKeywords: z.string().max(255).optional(),
  ogImage: z.string().url().optional().or(z.literal("")),
  faviconUrl: z.string().url().optional().or(z.literal("")),

  // Logo
  logoUrl: z.string().url().optional().or(z.literal("")),
  logoAltText: z.string().max(255).optional(),

  // Colors
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),

  // Navigation
  navigationItems: navigationItemsSchema,

  // Template-specific — shape varies per template, validated at consumption time
  customFields: z.any().optional(),
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
  ogImage: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  published: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  type: z.enum(["page", "policy", "blog", "custom"]).default("page"),
  template: z.enum(["default", "sidebar", "full-width"]).default("default"),
  image: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
});
