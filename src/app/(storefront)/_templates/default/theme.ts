import type { TemplateTheme } from "~/lib/template-themes";

/**
 * Curated theme presets for the `default` template.
 *
 * `default` renders most of its chrome with hardcoded hex values (near-black
 * CTAs, light-gray borders), so CSS-variable overrides only reach the
 * surfaces that are actually wired to shadcn tokens:
 *  - the auth split-panel (bg-primary / text-primary-foreground) on
 *    sign-in / sign-up / forgot-password / reset-password
 *  - primary/outline/ghost/secondary <Button> and <Badge> variants used in
 *    checkout, contact, shop filters, and cart/wishlist badges
 *  - form field borders + focus rings (<Input>) on checkout/contact
 *  - the homepage product-rail heading + subtext (text-foreground /
 *    text-muted-foreground)
 *
 * Stock (near-neutral black/white, zero chroma) is intentionally NOT
 * duplicated here — the editor's "Original" option covers it.
 */
export const defaultTemplateTheme: Record<string, TemplateTheme> = {
  default: {
    palettes: [
      {
        id: "slate",
        label: "Slate",
        swatch: ["oklch(0.32 0.04 250)", "oklch(0.20 0.02 250)", "oklch(0.90 0.01 250)"],
        cssVars: {
          "--primary": "oklch(0.32 0.04 250)",
          "--primary-foreground": "oklch(0.98 0.005 250)",
          "--foreground": "oklch(0.20 0.02 250)",
          "--muted-foreground": "oklch(0.50 0.02 250)",
          "--secondary": "oklch(0.95 0.01 250)",
          "--secondary-foreground": "oklch(0.25 0.02 250)",
          "--accent": "oklch(0.95 0.01 250)",
          "--accent-foreground": "oklch(0.25 0.02 250)",
          "--border": "oklch(0.88 0.01 250)",
          "--ring": "oklch(0.55 0.03 250)",
        },
      },
      {
        id: "forest",
        label: "Forest",
        swatch: ["oklch(0.32 0.07 150)", "oklch(0.20 0.03 150)", "oklch(0.90 0.015 150)"],
        cssVars: {
          "--primary": "oklch(0.32 0.07 150)",
          "--primary-foreground": "oklch(0.98 0.01 150)",
          "--foreground": "oklch(0.20 0.03 150)",
          "--muted-foreground": "oklch(0.48 0.03 150)",
          "--secondary": "oklch(0.95 0.015 150)",
          "--secondary-foreground": "oklch(0.25 0.03 150)",
          "--accent": "oklch(0.95 0.015 150)",
          "--accent-foreground": "oklch(0.25 0.03 150)",
          "--border": "oklch(0.88 0.015 150)",
          "--ring": "oklch(0.50 0.05 150)",
        },
      },
      {
        id: "burgundy",
        label: "Burgundy",
        swatch: ["oklch(0.32 0.10 20)", "oklch(0.20 0.03 20)", "oklch(0.90 0.015 20)"],
        cssVars: {
          "--primary": "oklch(0.32 0.10 20)",
          "--primary-foreground": "oklch(0.98 0.01 20)",
          "--foreground": "oklch(0.20 0.03 20)",
          "--muted-foreground": "oklch(0.48 0.03 20)",
          "--secondary": "oklch(0.95 0.015 20)",
          "--secondary-foreground": "oklch(0.25 0.03 20)",
          "--accent": "oklch(0.95 0.015 20)",
          "--accent-foreground": "oklch(0.25 0.03 20)",
          "--border": "oklch(0.88 0.015 20)",
          "--ring": "oklch(0.50 0.06 20)",
        },
      },
      {
        id: "ochre",
        label: "Ochre",
        swatch: ["oklch(0.42 0.09 75)", "oklch(0.22 0.02 75)", "oklch(0.92 0.02 75)"],
        cssVars: {
          "--primary": "oklch(0.42 0.09 75)",
          "--primary-foreground": "oklch(0.98 0.01 75)",
          "--foreground": "oklch(0.22 0.02 75)",
          "--muted-foreground": "oklch(0.50 0.03 75)",
          "--secondary": "oklch(0.95 0.02 75)",
          "--secondary-foreground": "oklch(0.27 0.02 75)",
          "--accent": "oklch(0.95 0.02 75)",
          "--accent-foreground": "oklch(0.27 0.02 75)",
          "--border": "oklch(0.88 0.02 75)",
          "--ring": "oklch(0.55 0.06 75)",
        },
      },
    ],
    fonts: [
      {
        id: "all-poppins",
        label: "All Poppins",
        // Headings (font-serif → Inter, stock) switch to the body font
        // (Poppins) for a unified geometric-sans look. One-directional
        // reference only — mutually-referencing custom properties would
        // form a cycle and both fonts would fall back to invalid.
        cssVars: { "--font-serif": "var(--font-sans)" },
      },
      {
        id: "all-inter",
        label: "All Inter",
        // Body font (font-sans → Poppins, stock) switches to match the
        // heading font (Inter) for a unified editorial look.
        cssVars: { "--font-sans": "var(--font-serif)" },
      },
    ],
  },
};
