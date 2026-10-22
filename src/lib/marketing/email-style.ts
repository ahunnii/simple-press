import { z } from "zod";

import type { EmailBodyTheme } from "./tiptap-to-email";
import { TEMPLATES } from "~/lib/constants";

/**
 * Marketing email style: the look of a store's campaign emails (accent color,
 * page background, font, header, footer), resolved against per-template
 * defaults so a store that never touches the settings still gets emails that
 * resemble its storefront.
 *
 * Scope: MARKETING emails only (campaigns and the like). Transactional emails
 * (receipts, password resets, ...) keep EmailLayout's neutral look.
 *
 * Do NOT derive the accent from `SiteContent.primaryColor`: it DB-defaults to
 * #000000 and most templates ignore it (see src/app/manifest.ts). The
 * per-template `emailDefaults` in `TEMPLATES` (src/lib/constants.ts) are taken
 * from each template's real CTA button color in globals.css instead.
 *
 * Pure and React-free: safe for the campaign worker, the renderer and the
 * admin UI alike.
 */

export const EMAIL_FONT_STACKS = {
  sans: "Helvetica,Arial,sans-serif",
  serif: 'Georgia,"Times New Roman",Times,serif',
} as const;

const LOGO_HEIGHTS = { sm: 40, md: 56, lg: 72 } as const;

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color like #1f2937")
  .transform((v) => v.toLowerCase());

export const emailStyleSchema = z
  .object({
    accent: hexColor.optional(),
    pageBackground: hexColor.optional(),
    font: z.enum(["sans", "serif"]).optional(),
    header: z.enum(["logo-center", "logo-left", "name"]).optional(),
    logoSize: z.enum(["sm", "md", "lg"]).optional(),
    showSocial: z.boolean().optional(),
    footerNote: z.string().trim().max(200).optional(),
  })
  .strict();

export type EmailStyle = z.infer<typeof emailStyleSchema>;

export type ResolvedEmailStyle = Required<EmailStyle> & {
  /** CSS font-family value for `font`. */
  fontStack: string;
  /** Label color on an accent-filled button (best WCAG contrast). */
  buttonText: "#ffffff" | "#111111";
  /** Text-link color on a white card: the accent unless it fails 4.5:1. */
  linkColor: string;
  /** Rendered logo height in px. */
  logoHeight: number;
};

type TemplateEmailDefaults = {
  accent: string;
  pageBackground: string;
  font: "sans" | "serif";
};

const FALLBACK_TEMPLATE_ID = "default";

const TEMPLATE_DEFAULTS: Record<string, TemplateEmailDefaults> =
  Object.fromEntries(
    TEMPLATES.map((t) => [t.id, t.emailDefaults as TemplateEmailDefaults]),
  );

/** The template's email defaults; unknown/empty ids use the Default template's. */
export function getTemplateEmailDefaults(
  templateId: string | null | undefined,
): TemplateEmailDefaults {
  return (
    (templateId ? TEMPLATE_DEFAULTS[templateId] : undefined) ??
    TEMPLATE_DEFAULTS[FALLBACK_TEMPLATE_ID]!
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG 2.x relative luminance of a `#rrggbb` color (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two `#rrggbb` colors (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Parse a stored style. Never throws: stored JSON may be stale (old keys,
 * hand-edited), so anything invalid yields `{}` and the template defaults.
 */
export function parseEmailStyle(raw: unknown): EmailStyle {
  const result = emailStyleSchema.safeParse(raw);
  return result.success ? result.data : {};
}

export function resolveEmailStyle({
  emailStyle,
  templateId,
}: {
  emailStyle: unknown;
  templateId: string | null | undefined;
}): ResolvedEmailStyle {
  const defaults = getTemplateEmailDefaults(templateId);
  const saved = parseEmailStyle(emailStyle);

  const accent = saved.accent ?? defaults.accent;
  const font = saved.font ?? defaults.font;
  const logoSize = saved.logoSize ?? "md";

  const buttonText =
    contrastRatio(accent, "#ffffff") >= contrastRatio(accent, "#111111")
      ? "#ffffff"
      : "#111111";

  return {
    accent,
    pageBackground: saved.pageBackground ?? defaults.pageBackground,
    font,
    header: saved.header ?? "logo-center",
    logoSize,
    showSocial: saved.showSocial ?? true,
    footerNote: saved.footerNote ?? "",
    fontStack: EMAIL_FONT_STACKS[font],
    buttonText,
    linkColor: contrastRatio(accent, "#ffffff") >= 4.5 ? accent : "#1f2937",
    logoHeight: LOGO_HEIGHTS[logoSize],
  };
}

/** The slice of a resolved style the tiptap email walker needs. */
export function emailBodyThemeFromStyle(
  style: ResolvedEmailStyle,
): EmailBodyTheme {
  return {
    linkColor: style.linkColor,
    accent: style.accent,
    buttonText: style.buttonText,
    fontStack: style.fontStack,
  };
}
