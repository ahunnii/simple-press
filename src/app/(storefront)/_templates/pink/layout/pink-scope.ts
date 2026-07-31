import { Fraunces, Manrope, Syne } from "next/font/google";

const fontSyne = Syne({
  subsets: ["latin"],
  variable: "--font-pink-syne",
  weight: ["600", "700", "800"],
});

const fontManrope = Manrope({
  subsets: ["latin"],
  variable: "--font-pink-manrope",
  weight: ["300", "400", "500", "600"],
});

const fontFraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-pink-fraunces",
  weight: ["600", "700"],
});

/**
 * Everything that makes a subtree "pink": the `.pink` token scope plus the
 * three font variables the scope's type rules reference.
 *
 * `PinkLayout` puts this on the page wrapper, but anything rendered through a
 * **portal** (Radix `Sheet`/`Dialog` mount on `document.body`) escapes that
 * wrapper — so every `var(--pink-*)` resolves to nothing and every `.pink …`
 * rule stops matching. The cart drawer shipped that way: no panel background,
 * no `.pink-btn` styling on the checkout button. Portaled pink surfaces must
 * re-apply this class themselves, along with the theme vars (see
 * `resolveThemeVars`) so owner theme presets still reach them.
 */
export const PINK_SCOPE_CLASS = `${fontSyne.variable} ${fontManrope.variable} ${fontFraunces.variable} pink`;
