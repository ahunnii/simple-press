import type { TemplateTheme } from "~/lib/template-themes";

/**
 * Curated palette presets for vii (Skinbar). Each palette overrides the
 * `--vii-*` brand tokens defined in the `.vii` block in globals.css — the
 * same tokens the whole template renders through (see
 * docs/design/vii-color-var-audit.md for the inline-literal → var audit).
 *
 * Deliberately NOT overridden per palette:
 * - `--vii-hairline` / `--vii-hairline-strong` — derived from `--vii-navy`
 *   via `color-mix()` in globals.css, so they update automatically.
 * - `--vii-error*` / `--vii-success*` — semantic form-state colors, kept
 *   constant across palettes so validation states stay recognizable.
 * - Layout/motion vars (`--radius`, `--vii-ease*`, `--vii-section-pad-*`,
 *   `--vii-container`, `--vii-scrim-*`) — not color, out of scope here.
 *
 * All text/surface pairings below were checked for >=4.5:1 contrast
 * (see the contrast check in the audit doc).
 */
export const viiTheme: Record<string, TemplateTheme> = {
  vii: {
    palettes: [
      {
        id: "midnight",
        label: "Midnight",
        swatch: ["#f8f7f3", "#17191c", "#9c6b3f"],
        cssVars: {
          "--vii-cream": "#eae7e0",
          "--vii-paper": "#f8f7f3",
          "--vii-navy": "#17191c",
          "--vii-slate": "#3a3a3d",
          "--vii-copper": "#9c6b3f",
          "--vii-copper-deep": "#835428",
          "--vii-copper-light": "#c99a6b",
          "--vii-clay": "#8f7a6a",
          "--vii-tan": "#b8ab98",
          "--vii-glacier": "#9aa6ab",
          "--vii-ink-soft": "#54575b",
        },
      },
      {
        id: "espresso",
        label: "Espresso",
        swatch: ["#faf5ec", "#2b1d16", "#b8863f"],
        cssVars: {
          "--vii-cream": "#f2e6d3",
          "--vii-paper": "#faf5ec",
          "--vii-navy": "#2b1d16",
          "--vii-slate": "#4a352a",
          "--vii-copper": "#b8863f",
          "--vii-copper-deep": "#7f551f",
          "--vii-copper-light": "#d9ac6c",
          "--vii-clay": "#8a6a52",
          "--vii-tan": "#c9b394",
          "--vii-glacier": "#c3b49c",
          "--vii-ink-soft": "#5c4a3d",
        },
      },
      {
        id: "pine",
        label: "Pine",
        swatch: ["#f6f5ee", "#1a2b23", "#a8663c"],
        cssVars: {
          "--vii-cream": "#e6e4d6",
          "--vii-paper": "#f6f5ee",
          "--vii-navy": "#1a2b23",
          "--vii-slate": "#33473c",
          "--vii-copper": "#a8663c",
          "--vii-copper-deep": "#84512e",
          "--vii-copper-light": "#c98f66",
          "--vii-clay": "#5f7267",
          "--vii-tan": "#9fae94",
          "--vii-glacier": "#a8c4b8",
          "--vii-ink-soft": "#4d5c53",
        },
      },
    ],
    fonts: [],
  },
};
