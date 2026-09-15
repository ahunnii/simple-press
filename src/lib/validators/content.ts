import { z } from "zod";

import { isSafeHref, SAFE_HREF_MESSAGE, safeHrefSchema } from "~/lib/safe-href";

/**
 * A social profile link. `.url()` used to be the only guard here, and it is
 * not a scheme guard — Zod accepts `javascript:` and `data:` as valid URLs
 * (see `~/lib/safe-href`). The scheme allowlist replaces it, and the extra
 * `http(s)` refine preserves the old field's meaning: a social profile is
 * always an absolute web address, never a relative path, so the admin form's
 * "must be a valid URL" expectation still holds.
 *
 * This runs on SAVE only. Legacy rows that already hold something else are
 * filtered at read time by `resolveSocialLinks` (`~/lib/social-links`).
 */
const socialUrlSchema = safeHrefSchema.refine(
  (v) => v === "" || /^https?:\/\//i.test(v),
  { message: "Must be an http(s) URL" },
);

const socialLinksSchema = z
  .object({
    instagram: socialUrlSchema.optional().nullable().or(z.literal("")),
    facebook: socialUrlSchema.optional().nullable().or(z.literal("")),
    twitter: socialUrlSchema.optional().nullable().or(z.literal("")),
    linkedin: socialUrlSchema.optional().nullable().or(z.literal("")),
    tiktok: socialUrlSchema.optional().nullable().or(z.literal("")),
    pinterest: socialUrlSchema.optional().nullable().or(z.literal("")),
    youtube: socialUrlSchema.optional().nullable().or(z.literal("")),
  })
  .optional();

/**
 * Navigation destinations are deliberately looser than social links: a nav
 * item legitimately points at `/shop` or `#contact`, so only the scheme is
 * constrained. The 500-char cap is the field's own (`safeHrefSchema` caps at
 * 2048), so the rule is applied via `isSafeHref` rather than by extending it.
 */
const navHrefSchema = z
  .string()
  .trim()
  .max(500)
  .refine(isSafeHref, { message: SAFE_HREF_MESSAGE });

const navChildSchema = z.object({
  label: z.string().max(100),
  href: navHrefSchema,
  external: z.boolean().optional(),
});

const navigationItemsSchema = z
  .array(
    z.object({
      label: z.string().max(100),
      href: navHrefSchema,
      external: z.boolean().optional(),
      children: z.array(navChildSchema).optional(),
    }),
  )
  .optional();

/** Max payload size for `customFields` on any content save (~1MB of JSON). */
const CUSTOM_FIELDS_MAX_BYTES = 1_000_000;

export const siteContentSchema = z
  .object({
    // NOTE: `templateId` is deliberately NOT accepted here. Commercial templates
    // are ownership-gated per subdomain (`isTemplateAvailableForSubdomain`), and
    // this procedure never validated that — any OWNER/MANAGER could hand itself a
    // paid template by posting one through a content save. Template changes go
    // through `business.updateTemplate`, which re-checks ownership server-side.

    // Hero Section
    heroTitle: z.string().max(255).optional(),
    heroSubtitle: z.string().max(500).optional(),
    heroImageUrl: z.string().url().optional().or(z.literal("")),
    heroButtonText: z.string().max(100).optional(),
    heroButtonLink: navHrefSchema.optional(),

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

    // Set by the visual editor's Publish action only — tells the server the
    // owner's durable draft (SiteContent.previewCustomFields) has just been
    // superseded by this save and should be cleared. Every other caller
    // (Branding, Navigation, legacy Template Fields editor) must omit this /
    // leave it false so an unrelated save never silently destroys an
    // in-progress /editor draft.
    clearPreviewDraft: z.boolean().optional(),

    // Set only by the visual editor's Publish — promotes every CMS page's
    // stored preview draft (Page.previewDraft) to its live columns in the same
    // transaction as this save. Omitted / false for all other callers.
    publishCmsPageDrafts: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    // Same cap `previewDraftSchema` enforces below — publish (updateSiteContent)
    // must not accept an unbounded customFields payload either. `customFields`
    // is `z.any()` above (shape varies per template), so this is the only place
    // that can catch an oversized publish.
    if (val.customFields === undefined) return;
    const size = JSON.stringify(val.customFields).length;
    if (size > CUSTOM_FIELDS_MAX_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Custom fields exceed ${CUSTOM_FIELDS_MAX_BYTES.toLocaleString()} characters`,
        path: ["customFields"],
      });
    }
  });

export const previewDraftSchema = z
  .object({
    customFields: z.record(z.string(), z.unknown()),
  })
  .superRefine((val, ctx) => {
    const size = JSON.stringify(val.customFields).length;
    if (size > CUSTOM_FIELDS_MAX_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Preview draft exceeds ${CUSTOM_FIELDS_MAX_BYTES.toLocaleString()} characters`,
      });
    }
  });

/**
 * Input for the visual editor's per-page CMS draft save. `draft` mirrors the
 * live page columns the editor can edit (title/excerpt/content). Capped at the
 * same ~1MB budget as every other content-save payload.
 */
export const cmsPageDraftSchema = z
  .object({
    pageId: z.string().min(1),
    draft: z.object({
      title: z.string().min(1).max(255),
      excerpt: z.string().max(2000).nullable(),
      content: z.any(), // TipTap JSON — shape validated at render time
    }),
  })
  .superRefine((val, ctx) => {
    const size = JSON.stringify(val.draft).length;
    if (size > CUSTOM_FIELDS_MAX_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Page draft exceeds ${CUSTOM_FIELDS_MAX_BYTES.toLocaleString()} characters`,
        path: ["draft"],
      });
    }
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
  publishedAt: z.union([z.coerce.date(), z.null()]).optional(),
  scheduledPublishAt: z.union([z.coerce.date(), z.null()]).optional(),
});
