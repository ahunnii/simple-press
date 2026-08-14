import type { TemplateTheme } from "~/lib/template-themes";

/**
 * Curated theme presets for the `happy-bamboo` template.
 *
 * happy-bamboo is heavily wired to shadcn tokens throughout (badges, CTA
 * sections, filter pills, cart/account chrome, form focus states), so
 * palettes override the full interactive-brand set: --primary/-foreground,
 * --secondary/-foreground, --muted/-foreground, --accent/-foreground,
 * --border, --ring — plus the template's own brand tokens (--hb-brand,
 * --hb-brand-deep, --hb-brand-muted, --hb-gold) that drive the header bar,
 * hero CTA, and skip link. --background/--foreground/--card are left
 * untouched to keep the bright cream/white base consistent. --hb-brand must
 * stay dark enough for white header text (>= 4.5:1).
 *
 * Stock is a leaf green (hue ~127) — not duplicated here; the editor's
 * "Original" option covers it. These variations stay within the same
 * warm-natural bamboo design language.
 */
export const happyBambooTheme: Record<string, TemplateTheme> = {
  "happy-bamboo": {
    palettes: [
      {
        id: "forest",
        label: "Forest",
        swatch: [
          "oklch(0.28 0.08 145)",
          "oklch(0.42 0.11 145)",
          "oklch(0.90 0.03 145)",
        ],
        cssVars: {
          "--hb-brand": "oklch(0.42 0.11 145)",
          "--hb-brand-deep": "oklch(0.30 0.09 145)",
          "--hb-brand-muted": "oklch(0.48 0.05 145)",
          "--hb-gold": "oklch(0.88 0.06 120)",
          "--primary": "oklch(0.42 0.11 145)",
          "--primary-foreground": "oklch(0.98 0.01 145)",
          "--secondary": "oklch(0.96 0.015 145)",
          "--secondary-foreground": "oklch(0.24 0.02 145)",
          "--muted": "oklch(0.95 0.012 145)",
          "--muted-foreground": "oklch(0.48 0.03 145)",
          "--accent": "oklch(0.95 0.012 145)",
          "--accent-foreground": "oklch(0.24 0.02 145)",
          "--border": "oklch(0.90 0.015 145)",
          "--ring": "oklch(0.55 0.08 145)",
        },
      },
      {
        id: "terracotta",
        label: "Terracotta",
        swatch: [
          "oklch(0.32 0.10 40)",
          "oklch(0.48 0.13 40)",
          "oklch(0.90 0.04 50)",
        ],
        cssVars: {
          "--hb-brand": "oklch(0.48 0.13 40)",
          "--hb-brand-deep": "oklch(0.34 0.11 40)",
          "--hb-brand-muted": "oklch(0.52 0.06 40)",
          "--hb-gold": "oklch(0.89 0.06 70)",
          "--primary": "oklch(0.48 0.13 40)",
          "--primary-foreground": "oklch(0.98 0.01 60)",
          "--secondary": "oklch(0.96 0.015 50)",
          "--secondary-foreground": "oklch(0.26 0.02 40)",
          "--muted": "oklch(0.95 0.012 50)",
          "--muted-foreground": "oklch(0.50 0.03 40)",
          "--accent": "oklch(0.95 0.012 50)",
          "--accent-foreground": "oklch(0.26 0.02 40)",
          "--border": "oklch(0.90 0.02 50)",
          "--ring": "oklch(0.55 0.09 40)",
        },
      },
      {
        id: "ocean",
        label: "Ocean",
        swatch: [
          "oklch(0.30 0.07 210)",
          "oklch(0.46 0.10 210)",
          "oklch(0.90 0.03 210)",
        ],
        cssVars: {
          "--hb-brand": "oklch(0.46 0.10 210)",
          "--hb-brand-deep": "oklch(0.32 0.08 210)",
          "--hb-brand-muted": "oklch(0.50 0.05 210)",
          "--hb-gold": "oklch(0.89 0.05 80)",
          "--primary": "oklch(0.46 0.10 210)",
          "--primary-foreground": "oklch(0.98 0.01 210)",
          "--secondary": "oklch(0.96 0.012 210)",
          "--secondary-foreground": "oklch(0.25 0.02 210)",
          "--muted": "oklch(0.95 0.01 210)",
          "--muted-foreground": "oklch(0.50 0.025 210)",
          "--accent": "oklch(0.95 0.01 210)",
          "--accent-foreground": "oklch(0.25 0.02 210)",
          "--border": "oklch(0.90 0.015 210)",
          "--ring": "oklch(0.55 0.07 210)",
        },
      },
      {
        id: "honey",
        label: "Honey",
        swatch: [
          "oklch(0.40 0.09 85)",
          "oklch(0.72 0.14 85)",
          "oklch(0.95 0.03 85)",
        ],
        cssVars: {
          "--hb-brand": "oklch(0.40 0.09 85)",
          "--hb-brand-deep": "oklch(0.30 0.07 85)",
          "--hb-brand-muted": "oklch(0.48 0.05 85)",
          "--hb-gold": "oklch(0.93 0.06 95)",
          "--primary": "oklch(0.72 0.14 85)",
          "--primary-foreground": "oklch(0.22 0.03 85)",
          "--secondary": "oklch(0.96 0.02 85)",
          "--secondary-foreground": "oklch(0.26 0.02 85)",
          "--muted": "oklch(0.95 0.015 85)",
          "--muted-foreground": "oklch(0.48 0.035 85)",
          "--accent": "oklch(0.95 0.015 85)",
          "--accent-foreground": "oklch(0.26 0.02 85)",
          "--border": "oklch(0.90 0.02 85)",
          "--ring": "oklch(0.6 0.1 85)",
        },
      },
    ],
    fonts: [
      {
        id: "spectral-headings",
        label: "Spectral Headings",
        // Headings (font-heading → Outfit, stock) switch to the already-
        // loaded serif (Spectral) for a more editorial headline feel.
        // One-directional reference — see default/theme.ts note on cycles.
        cssVars: { "--font-heading": "var(--font-serif)" },
      },
      {
        id: "outfit-everywhere",
        label: "Outfit Everywhere",
        // Serif accents (font-serif → Spectral, stock) switch to match the
        // sans (Outfit) for a unified geometric look.
        cssVars: { "--font-serif": "var(--font-sans)" },
      },
    ],
  },
};
