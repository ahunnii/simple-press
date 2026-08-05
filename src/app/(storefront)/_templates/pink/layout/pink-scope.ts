import { Fraunces, Nunito_Sans } from "next/font/google";

const fontFraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-pink-fraunces",
  // Loaded as the VARIABLE font (2026-08-04, hero redesign) rather than as
  // static 600/700 cuts. The variable file covers both of those usages — 600
  // is the default `.pink-display` weight (headings, section titles, most
  // display text), 700 is the header/footer wordmark fallback — and it also
  // exposes Fraunces' two expressive axes, which the hero's live-text
  // wordmark fallback needs (the default hero render is a traced SVG,
  // `PinkWordmarkSvg`; the axes only come into play once an owner edits
  // the wordmark fields away from their defaults and the hero falls back
  // to real text): `SOFT` (rounded terminals) and `WONK` (quirky
  // alternates), set via `font-variation-settings` on
  // `.pink-hero-wordmark` and nowhere else.
  // Both axes default to 0, and `font-variation-settings` only overrides the
  // axes it names, so every other display element renders exactly as before.
  // `weight` must be omitted when `axes` is set — the array selects static
  // cuts, and the two are mutually exclusive in next/font.
  axes: ["SOFT", "WONK"],
});

const fontNunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-pink-nunito",
  // Audited every `font-weight`/`fontWeight`/Tailwind `font-*` usage across
  // the pink template (2026-07-31, font swap): 400 (inline `fontWeight: 400`
  // on inactive tabs/pills — the implicit body default also needs it
  // explicitly loaded so it isn't faux-synthesized), 500 (`font-medium`,
  // used everywhere: nav links, buttons, badges), 600 (`font-semibold` /
  // `.pink-eyebrow` / `.pink-btn`, used everywhere for body-text emphasis).
  // No 300 usage found anywhere in the template (Manrope's 300 was dead
  // weight) and no 700+ body-text usage — every `fontWeight: 700` in the
  // codebase is on a `.pink-display` (Fraunces) element, never body text.
  weight: ["400", "500", "600"],
});

/**
 * Everything that makes a subtree "pink": the `.pink` token scope plus the
 * two font variables the scope's type rules reference (Fraunces for display,
 * Nunito Sans for body).
 *
 * `PinkLayout` puts this on the page wrapper, but anything rendered through a
 * **portal** (Radix `Sheet`/`Dialog` mount on `document.body`) escapes that
 * wrapper — so every `var(--pink-*)` resolves to nothing and every `.pink …`
 * rule stops matching. The cart drawer shipped that way: no panel background,
 * no `.pink-btn` styling on the checkout button. Portaled pink surfaces must
 * re-apply this class themselves, along with the theme vars (see
 * `resolveThemeVars`) so owner theme presets still reach them.
 */
export const PINK_SCOPE_CLASS = `${fontFraunces.variable} ${fontNunitoSans.variable} pink`;
