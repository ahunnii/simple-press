import type { TemplateTheme } from "~/lib/template-themes";

/**
 * Theme presets for the `pink` template.
 *
 * Rebuilt 2026-07-31 alongside the clean white/pink/black re-tone. Every
 * palette keeps the SAME structure as the default, so the "clean" reading
 * survives a theme switch:
 *   • pure white ground and neutral black — these never move
 *   • neutral greys for all body copy — these never move
 *   • the accent hue carries the identity, via a tinted WASH surface
 *     (`--pink-panel`) rather than by warming the neutrals
 *
 * The previous ochre/viridian presets were built on the old warm-grey
 * structure and would have reintroduced the muddiness the re-tone removed.
 *
 * `--pink-line-strong` / `--pink-line-button` are deliberately NOT overridden:
 * they are the interactive-boundary tokens that must clear 3:1 (WCAG 1.4.11),
 * and a neutral #8c8c8c does that on every wash. Derived tokens
 * (`--pink-scrim`) are `color-mix()` over these vars and update for free.
 *
 * Contrast verified for every palette (all ≥4.5:1 text, ≥3:1 non-text):
 *   accent-on-white  — pink 4.95 · coral 5.87 · violet 5.85 · teal 5.68
 *   white-on-accent  — pink 4.95 · coral 5.87 · violet 5.85 · teal 5.68
 *   accent-on-wash   — pink 4.60 · coral 5.39 · violet 5.31 · teal 5.32
 *   blush-on-black   — pink 6.07 · coral 6.48 · violet 7.44 · teal 10.17
 *
 * The editor auto-offers "Original" (no selection = pixel-identical stock), so
 * none of these duplicates the default pink palette.
 */
export const pinkTheme: Record<string, TemplateTheme> = {
  pink: {
    palettes: [
      {
        id: "coral",
        label: "Coral",
        swatch: ["#ffffff", "#101010", "#c2185b"],
        cssVars: {
          "--pink-rose": "#c2185b",
          "--pink-blush": "#ff5c8a",
          "--pink-petal": "#ffc2d0",
          "--pink-petal-badge": "#ffd6df",
          "--pink-panel": "#fff2f4",
          "--pink-panel-strong": "#ffe6ea",
        },
      },
      {
        id: "violet",
        label: "Violet",
        swatch: ["#ffffff", "#101010", "#7b2ff7"],
        cssVars: {
          "--pink-rose": "#7b2ff7",
          "--pink-blush": "#b78cff",
          "--pink-petal": "#d9c7ff",
          "--pink-petal-badge": "#e6dbff",
          "--pink-panel": "#f6f2ff",
          "--pink-panel-strong": "#ece4ff",
        },
      },
      {
        id: "teal",
        label: "Teal",
        swatch: ["#ffffff", "#101010", "#00727c"],
        cssVars: {
          "--pink-rose": "#00727c",
          "--pink-blush": "#3fd0d8",
          "--pink-petal": "#a9e9ec",
          "--pink-petal-badge": "#c6f2f4",
          "--pink-panel": "#eefafa",
          "--pink-panel-strong": "#ddf3f4",
        },
      },
    ],
    fonts: [
      {
        id: "all-sans",
        label: "All Sans — Nunito Sans",
        cssVars: {
          "--font-pink-display": "var(--font-pink-nunito)",
        },
      },
    ],
  },
};
