import { getThemeSelection } from "~/lib/sp-meta";
import { defaultTemplateTheme } from "~/app/(storefront)/_templates/default/theme";
import { happyBambooTheme } from "~/app/(storefront)/_templates/happy-bamboo/theme";
import { viiTheme } from "~/app/(storefront)/_templates/vii/theme";

/**
 * Curated theme presets per template. The platform author defines a small
 * set of color palettes and font pairings that are guaranteed to look good
 * with the template's design; owners pick from swatches in the visual
 * editor. Selections are stored under `customFields._sp.theme` and applied
 * as inline CSS variables on the template's root wrapper — so they ride the
 * preview-draft pipeline and beat the class-level defaults in globals.css.
 */

export type TemplateThemePalette = {
  id: string;
  /** Owner-facing name, e.g. "Forest", "Slate & Gold". */
  label: string;
  /** Three representative colors for the editor swatch chip. */
  swatch: [string, string, string];
  /** CSS custom properties to set on the template root. */
  cssVars: Record<string, string>;
};

export type TemplateFontPairing = {
  id: string;
  /** Owner-facing name, e.g. "Playfair / Inter". */
  label: string;
  /**
   * CSS custom properties remapping the template's font vars. Values may
   * only reference fonts the template layout already loads via next/font.
   */
  cssVars: Record<string, string>;
};

export type TemplateTheme = {
  palettes: TemplateThemePalette[];
  fonts: TemplateFontPairing[];
};

/**
 * Registry, keyed by templateId — spread from per-template theme.ts files,
 * mirroring TEMPLATE_FIELDS / TEMPLATE_SECTIONS. Templates absent from the
 * map simply have no Theme entry in the editor.
 */
export const TEMPLATE_THEMES: Record<string, TemplateTheme> = {
  ...defaultTemplateTheme,
  ...happyBambooTheme,
  ...viiTheme,
};

/** Returns the theme definition for a template, or null when it has none. */
export function getTemplateTheme(templateId: string): TemplateTheme | null {
  const theme = TEMPLATE_THEMES[templateId];
  if (!theme || (theme.palettes.length === 0 && theme.fonts.length === 0)) {
    return null;
  }
  return theme;
}

/**
 * Resolves the owner's stored theme selection into inline CSS variables for
 * the template root, or null when nothing (valid) is selected — the template
 * then renders with its stock design. Unknown preset ids are ignored, so a
 * template can retire a preset without breaking stores that had it selected.
 */
export function resolveThemeVars(
  templateId: string,
  customFields: unknown,
): Record<string, string> | null {
  const theme = getTemplateTheme(templateId);
  if (!theme) return null;

  const selection = getThemeSelection(customFields);
  const palette = selection.palette
    ? theme.palettes.find((p) => p.id === selection.palette)
    : undefined;
  const fonts = selection.fonts
    ? theme.fonts.find((f) => f.id === selection.fonts)
    : undefined;
  if (!palette && !fonts) return null;

  return { ...palette?.cssVars, ...fonts?.cssVars };
}
