import { Fraunces, Nunito_Sans } from "next/font/google";

const fontFraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-pink-fraunces",
  // 600 is the default `.pink-display` weight (headings, section titles,
  // most display text). 700 is used for the wordmark fallback (header/footer
  // logo text) — every other display weight in the template is 600.
  weight: ["600", "700"],
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
