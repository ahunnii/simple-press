"use server";

import type { DefaultLayoutTemplateProps } from "../../types";
import { keyToPublicUrl } from "~/lib/s3/url";
import { resolveThemeVars } from "~/lib/template-themes";

import { CoopFooter } from "./coop-footer";
import { CoopHeader } from "./coop-header";

/**
 * The coop template's fonts (futura-pt, minion-pro, Agdasima) are Adobe/clone
 * captures that must NEVER be committed to the repo or loaded via next/font.
 * They live in MinIO at `templates/coop/fonts/<file>.woff2` and are emitted
 * here as a plain `@font-face` `<style>` tag built from `keyToPublicUrl`.
 * See docs/templates/coop/upload-fonts.md for the one-time upload step; until
 * the files are uploaded, coop pages render with the fallback stacks declared
 * in the `--font-coop-*` tokens (globals.css `.coop` block).
 */

const AGDASIMA_UNICODE_LATIN =
  "U+0-FF,U+131,U+152-153,U+2BB-2BC,U+2C6,U+2DA,U+2DC,U+304,U+308,U+329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const AGDASIMA_UNICODE_EXT =
  "U+100-2BA,U+2BD-2C5,U+2C7-2CC,U+2CE-2D7,U+2DD-2FF,U+304,U+308,U+329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";

type CoopFontFace = {
  family: string;
  weight: 400 | 700;
  style?: "italic";
  file: string;
  unicodeRange?: string;
};

const COOP_FONT_FACES: CoopFontFace[] = [
  {
    family: "Agdasima",
    weight: 400,
    file: "agdasima-400-latin.woff2",
    unicodeRange: AGDASIMA_UNICODE_LATIN,
  },
  {
    family: "Agdasima",
    weight: 400,
    file: "agdasima-400-latin-ext.woff2",
    unicodeRange: AGDASIMA_UNICODE_EXT,
  },
  {
    family: "Agdasima",
    weight: 700,
    file: "agdasima-700-latin.woff2",
    unicodeRange: AGDASIMA_UNICODE_LATIN,
  },
  {
    family: "Agdasima",
    weight: 700,
    file: "agdasima-700-latin-ext.woff2",
    unicodeRange: AGDASIMA_UNICODE_EXT,
  },
  { family: "futura-pt", weight: 400, file: "futura-pt-400.woff2" },
  { family: "futura-pt", weight: 700, file: "futura-pt-700.woff2" },
  { family: "minion-pro", weight: 400, file: "minion-pro-400.woff2" },
  { family: "minion-pro", weight: 700, file: "minion-pro-700.woff2" },
  {
    family: "minion-pro",
    weight: 400,
    style: "italic",
    file: "minion-pro-italic-400.woff2",
  },
];

function buildCoopFontFaceCss(): string {
  return COOP_FONT_FACES.map((face) => {
    const url = keyToPublicUrl(`templates/coop/fonts/${face.file}`);
    const unicodeRange = face.unicodeRange
      ? `\n  unicode-range: ${face.unicodeRange};`
      : "";
    return `@font-face {
  font-family: "${face.family}";
  font-style: ${face.style ?? "normal"};
  font-weight: ${face.weight};
  font-display: swap;
  src: url("${url}") format("woff2");${unicodeRange}
}`;
  }).join("\n");
}

export async function CoopLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  const themeVars = resolveThemeVars(
    "coop",
    business.siteContent?.customFields,
  );

  return (
    <div className="coop flex min-h-screen flex-col" style={themeVars ?? undefined}>
      <style dangerouslySetInnerHTML={{ __html: buildCoopFontFaceCss() }} />

      {/* Skip link — always the first focusable element */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-9999 focus:bg-[var(--coop-background)] focus:px-4 focus:py-2 focus:text-[var(--coop-color-003)] focus:shadow-lg"
      >
        Skip to main content
      </a>

      <div className="relative flex-1">
        <CoopHeader business={business} />
        <main id="main-content">{children}</main>
      </div>

      <CoopFooter business={business} />
    </div>
  );
}
