import type { TemplateTheme } from "~/lib/template-themes";

/**
 * Curated theme presets for the `bamboo` template.
 *
 * bamboo runs a dual token layer: the --bam-* brand set drives the chrome
 * (header bar, hanging emblem ring, wave dividers, value band, footer slab)
 * while the shadcn interactive set styles everything else. Palettes must
 * override both together — a --bam-forest that drifts from --primary splits
 * the chrome from the page. --bam-cream / --background and the neutral card
 * family are left untouched so every preset keeps the warm-paper base the
 * layout's photography and gold rules are balanced against.
 *
 * Contrast contract (docs/templates/bamboo/design.md): --bam-gold is
 * text-grade on cream for LARGE text only; --bam-gold-soft must hold ~7:1 on
 * --bam-forest (nav links live there); --bam-forest must stay dark enough
 * for cream text (>= 4.5:1).
 *
 * Stock (deep forest + antique gold, hue ~155/92) lives in globals.css and
 * is covered by the editor's "Original" option — not duplicated here.
 */
export const bambooTheme: Record<string, TemplateTheme> = {
  bamboo: {
    palettes: [
      {
        id: "olive-sand",
        label: "Olive & Sand",
        swatch: [
          "oklch(0.30 0.06 110)",
          "oklch(0.40 0.08 110)",
          "oklch(0.87 0.05 100)",
        ],
        cssVars: {
          "--bam-forest": "oklch(0.40 0.08 110)",
          "--bam-forest-deep": "oklch(0.30 0.07 110)",
          "--bam-gold": "oklch(0.50 0.09 95)",
          "--bam-gold-soft": "oklch(0.88 0.05 100)",
          "--primary": "oklch(0.40 0.08 110)",
          "--primary-foreground": "oklch(0.96 0.02 100)",
          "--secondary": "oklch(0.92 0.03 100)",
          "--secondary-foreground": "oklch(0.28 0.03 110)",
          "--muted": "oklch(0.93 0.02 105)",
          "--muted-foreground": "oklch(0.45 0.03 110)",
          "--accent": "oklch(0.50 0.09 95)",
          "--accent-foreground": "oklch(0.96 0.02 100)",
          "--border": "oklch(0.88 0.025 100)",
          "--ring": "oklch(0.55 0.08 110)",
        },
      },
      {
        id: "terracotta",
        label: "Terracotta",
        swatch: [
          "oklch(0.32 0.09 40)",
          "oklch(0.42 0.11 40)",
          "oklch(0.88 0.05 70)",
        ],
        cssVars: {
          "--bam-forest": "oklch(0.42 0.11 40)",
          "--bam-forest-deep": "oklch(0.32 0.09 40)",
          "--bam-gold": "oklch(0.50 0.09 70)",
          "--bam-gold-soft": "oklch(0.88 0.05 70)",
          "--primary": "oklch(0.42 0.11 40)",
          "--primary-foreground": "oklch(0.97 0.015 70)",
          "--secondary": "oklch(0.92 0.03 70)",
          "--secondary-foreground": "oklch(0.28 0.03 40)",
          "--muted": "oklch(0.93 0.02 60)",
          "--muted-foreground": "oklch(0.46 0.035 40)",
          "--accent": "oklch(0.50 0.09 70)",
          "--accent-foreground": "oklch(0.97 0.015 70)",
          "--border": "oklch(0.88 0.03 70)",
          "--ring": "oklch(0.55 0.09 40)",
        },
      },
      {
        id: "midnight-pine",
        label: "Midnight Pine",
        swatch: [
          "oklch(0.24 0.04 180)",
          "oklch(0.30 0.05 180)",
          "oklch(0.86 0.05 95)",
        ],
        cssVars: {
          "--bam-forest": "oklch(0.30 0.05 180)",
          "--bam-forest-deep": "oklch(0.24 0.04 180)",
          "--bam-gold": "oklch(0.50 0.08 95)",
          "--bam-gold-soft": "oklch(0.86 0.05 95)",
          "--primary": "oklch(0.30 0.05 180)",
          "--primary-foreground": "oklch(0.96 0.015 95)",
          "--secondary": "oklch(0.92 0.02 180)",
          "--secondary-foreground": "oklch(0.26 0.03 180)",
          "--muted": "oklch(0.93 0.015 180)",
          "--muted-foreground": "oklch(0.44 0.03 180)",
          "--accent": "oklch(0.50 0.08 95)",
          "--accent-foreground": "oklch(0.96 0.015 95)",
          "--border": "oklch(0.88 0.02 180)",
          "--ring": "oklch(0.50 0.06 180)",
        },
      },
      {
        id: "clay-sage",
        label: "Clay & Sage",
        swatch: [
          "oklch(0.32 0.05 130)",
          "oklch(0.42 0.06 130)",
          "oklch(0.88 0.05 90)",
        ],
        cssVars: {
          "--bam-forest": "oklch(0.42 0.06 130)",
          "--bam-forest-deep": "oklch(0.32 0.05 130)",
          "--bam-gold": "oklch(0.50 0.08 80)",
          "--bam-gold-soft": "oklch(0.88 0.05 90)",
          "--primary": "oklch(0.42 0.06 130)",
          "--primary-foreground": "oklch(0.96 0.02 95)",
          "--secondary": "oklch(0.92 0.025 110)",
          "--secondary-foreground": "oklch(0.28 0.03 130)",
          "--muted": "oklch(0.93 0.02 115)",
          "--muted-foreground": "oklch(0.45 0.03 130)",
          "--accent": "oklch(0.50 0.08 80)",
          "--accent-foreground": "oklch(0.96 0.02 95)",
          "--border": "oklch(0.88 0.025 100)",
          "--ring": "oklch(0.55 0.06 130)",
        },
      },
    ],
    fonts: [
      {
        id: "spectral-headings",
        label: "Spectral Headings",
        // Headings (font-heading → Outfit, stock) switch to the already-
        // loaded serif (Spectral) for a more editorial headline feel —
        // mirrors happy-bamboo's preset of the same name.
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
