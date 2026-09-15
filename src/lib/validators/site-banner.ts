import { z } from "zod";

import { safeHrefSchema } from "~/lib/safe-href";

const tiptapContent = z.record(z.string(), z.unknown()).nullable(); // matches pageContentSchema usage

export const bannerConfigSchema = z.object({
  enabled: z.boolean().default(false),
  version: z.string().min(1),
  content: tiptapContent,
  // Rendered as the banner's `href`. `safeHrefSchema` keeps the same trim +
  // 2048 cap and adds the scheme allowlist (`~/lib/safe-href`).
  linkUrl: safeHrefSchema.nullish(),
  linkLabel: z.string().trim().max(120).nullish(),
  bgColor: z.string().trim().max(32).nullish(),
  textColor: z.string().trim().max(32).nullish(),
});
export type BannerConfig = z.infer<typeof bannerConfigSchema>;

export const popupConfigSchema = z.object({
  enabled: z.boolean().default(false),
  version: z.string().min(1),
  mode: z.enum(["image", "text"]),
  heading: z.string().trim().max(160).nullish(),
  imagePath: z.string().trim().nullish(), // pathname from /api/upload
  imageAlt: z.string().trim().max(200).nullish(),
  content: tiptapContent, // text mode
  // Rendered as the popup CTA's `href` — same guard as `bannerConfigSchema.linkUrl`.
  ctaUrl: safeHrefSchema.nullish(),
  ctaLabel: z.string().trim().max(120).nullish(),
});
export type PopupConfig = z.infer<typeof popupConfigSchema>;

// version is server-generated, so omit on the wire
export const updateBannerConfigSchema = bannerConfigSchema.omit({
  version: true,
});
export const updatePopupConfigSchema = popupConfigSchema.omit({
  version: true,
});

/** Short random id regenerated on every admin save — used as dismissal key. */
export function newVersion(): string {
  return Math.random().toString(36).slice(2, 10);
}
