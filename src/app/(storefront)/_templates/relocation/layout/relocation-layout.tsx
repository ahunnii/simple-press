"use server";

import { Roboto } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import { keyToPublicUrl } from "~/lib/s3/url";
import { resolveThemeVars } from "~/lib/template-themes";
import { cn } from "~/lib/utils";
import { getSession } from "~/server/better-auth/server";

import { RelocationFooter } from "./relocation-footer";
import { RelocationHeader } from "./relocation-header";

/**
 * The relocation template's display face, **omnes-pro**, is Adobe-licensed and
 * must NEVER be committed to the repo or loaded through next/font. Like coop's
 * futura-pt/minion-pro, the woff2s live in MinIO at
 * `templates/relocation/fonts/<file>.woff2` and are emitted here as a plain
 * `@font-face` <style> tag built from `keyToPublicUrl`. See
 * docs/templates/relocation/upload-fonts.md for the one-time upload; until the
 * files land, pages render with the fallback stack declared in the
 * `--font-relocation-display` token (globals.css `.relocation` block).
 *
 * Roboto (body, weight 500 normal + italic) is a Google face, so it comes from
 * next/font as `--font-relocation-roboto`, which the token block maps onto
 * `--font-relocation-body`.
 */

const fontBody = Roboto({
  subsets: ["latin"],
  variable: "--font-relocation-roboto",
  weight: ["500"],
  style: ["normal", "italic"],
  display: "swap",
});

type RelocationFontFace = {
  weight: 500 | 600 | 700;
  style?: "italic";
  file: string;
};

const RELOCATION_FONT_FACES: RelocationFontFace[] = [
  { weight: 500, file: "omnes-pro-500.woff2" },
  { weight: 500, style: "italic", file: "omnes-pro-500-italic.woff2" },
  { weight: 600, file: "omnes-pro-600.woff2" },
  { weight: 600, style: "italic", file: "omnes-pro-600-italic.woff2" },
  { weight: 700, file: "omnes-pro-700.woff2" },
  { weight: 700, style: "italic", file: "omnes-pro-700-italic.woff2" },
];

function buildRelocationFontFaceCss(): string {
  return RELOCATION_FONT_FACES.map((face) => {
    const url = keyToPublicUrl(`templates/relocation/fonts/${face.file}`);
    return `@font-face {
  font-family: "omnes-pro";
  font-style: ${face.style ?? "normal"};
  font-weight: ${face.weight};
  font-display: swap;
  src: url("${url}") format("woff2");
}`;
  }).join("\n");
}

/**
 * The recovered Squarespace divider path behind the wave hero (design.md →
 * "The wave hero"): six alternating cubic humps, amplitude 0.03776, expressed
 * in `objectBoundingBox` units so the same markup renders an identical edge at
 * any hero width or height. Emitted once per page here and referenced by every
 * `RelocationWaveHero` through `clip-path: url(#relocation-wave)`.
 */
const RELOCATION_WAVE_PATH =
  "M-1.0075,0.941 L-1.0075,0.9705 c0.25125,-0.03776 0.25125,-0.03776 0.5025,0 s0.25125,0.03776 0.5025,0 c0.25125,-0.03776 0.25125,-0.03776 0.5025,0 s0.25125,0.03776 0.5025,0 c0.25125,-0.03776 0.25125,-0.03776 0.5025,0 s0.25125,0.03776 0.5025,0 L1,-1 L0,-1 z";

export async function RelocationLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  const session = await getSession();

  // Fixed brand — no palettes are registered for `relocation`, so this returns
  // null today. Kept so a future preset set works without touching the layout.
  const themeVars = resolveThemeVars(
    "relocation",
    business.siteContent?.customFields,
  );

  return (
    <div
      className={cn(
        fontBody.variable,
        "relocation default-template flex min-h-screen flex-col",
      )}
      style={themeVars ?? undefined}
    >
      {/*
       * `default-template` rides alongside `relocation` so DEFAULT-TEMPLATE
       * FALLBACK pages (all commerce, blog, events, videos, auth — relocation
       * is a service-archetype partial template) pick up the
       * `.default-template` font/radius tokens and, more importantly, its
       * `*:focus-visible` outline rule. Relocation's own pages set colours and
       * fonts exclusively through `--relocation-*` tokens, never
       * `var(--font-sans)` / `var(--radius)`, so those tokens are inert here.
       * Same reasoning as CoopLayout / BuildersLayout.
       */}
      <style
        dangerouslySetInnerHTML={{ __html: buildRelocationFontFaceCss() }}
      />

      {/* Wave clip-path definition — one per page, zero-size, never painted. */}
      <svg
        width={0}
        height={0}
        aria-hidden="true"
        focusable="false"
        className="absolute"
      >
        <defs>
          <clipPath id="relocation-wave" clipPathUnits="objectBoundingBox">
            <path d={RELOCATION_WAVE_PATH} />
          </clipPath>
        </defs>
      </svg>

      {/* Skip link — always the first focusable element. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-9999 focus:rounded-[var(--relocation-radius)] focus:bg-[var(--relocation-terracotta)] focus:px-4 focus:py-2 focus:text-[var(--relocation-paper)] focus:shadow-lg"
      >
        Skip to main content
      </a>

      <div className="relative flex-1">
        <RelocationHeader business={business} session={session ?? null} />
        <main id="main-content">{children}</main>
      </div>

      <RelocationFooter business={business} />
    </div>
  );
}
