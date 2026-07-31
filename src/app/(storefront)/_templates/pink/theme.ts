import type { TemplateTheme } from "~/lib/template-themes";

/**
 * Theme presets for the `pink` template.
 *
 * All three palettes keep the ink chrome and the paper body — the light/dark
 * inversion IS the template's identity, so only the accent trio and the paper
 * temperature move. Derived tokens (`--pink-scrim`, `--pink-glow-*`) are
 * computed with `color-mix()` in globals.css and update for free; semantic
 * error/success colors deliberately stay constant so validation states remain
 * recognizable across palettes.
 *
 * Contrast verified for every palette (see docs/templates/pink/design.md):
 *   accent-on-paper  — rose 6.2:1 · ochre 5.0:1 · viridian 7.0:1
 *   white-on-accent  — rose 6.7:1 · ochre 5.6:1 · viridian 7.6:1
 *   blush-on-ink     — rose 5.1:1 · ochre 7.6:1 · viridian 7.0:1
 *
 * The editor auto-offers "Original" (no selection = pixel-identical stock), so
 * none of these duplicates the default rose palette.
 */
export const pinkTheme: Record<string, TemplateTheme> = {
  pink: {
    palettes: [
      {
        id: "ochre",
        label: "Ochre",
        swatch: ["#f7f3ec", "#111011", "#96591c"],
        cssVars: {
          "--pink-rose": "#96591c",
          "--pink-blush": "#d8963f",
          "--pink-petal": "#f0cf9e",
          "--pink-petal-badge": "#f4d9b0",
          "--pink-paper": "#f7f3ec",
          "--pink-panel": "#efe8dc",
          "--pink-line": "#e3dccd",
          "--pink-line-soft": "#eae4d8",
          "--pink-line-strong": "#ddd4c3",
          "--pink-line-button": "#d9cfbc",
        },
      },
      {
        id: "viridian",
        label: "Viridian",
        swatch: ["#f2f5f3", "#111011", "#1f5d4c"],
        cssVars: {
          "--pink-rose": "#1f5d4c",
          "--pink-blush": "#4fae8f",
          "--pink-petal": "#a9dcc9",
          "--pink-petal-badge": "#bde6d6",
          "--pink-paper": "#f2f5f3",
          "--pink-panel": "#e6ede9",
          "--pink-line": "#d8e2dc",
          "--pink-line-soft": "#e2eae5",
          "--pink-line-strong": "#cfdbd4",
          "--pink-line-button": "#c8d6ce",
        },
      },
    ],
    fonts: [
      {
        id: "fraunces",
        label: "Fraunces + Manrope",
        cssVars: {
          "--font-pink-display": "var(--font-pink-fraunces)",
        },
      },
    ],
  },
};
