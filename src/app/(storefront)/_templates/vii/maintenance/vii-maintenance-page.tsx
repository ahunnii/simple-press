import { Jost, Playfair_Display } from "next/font/google";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import type { MaintenancePageTemplateProps } from "../../types";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { resolveThemeVars } from "~/lib/template-themes";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { ViiOverline } from "../shared/vii-overline";

/*
  This screen renders OUTSIDE `ViiLayout` — `src/app/(storefront)/layout.tsx`
  and `src/app/page.tsx` short-circuit to `t.MaintenancePage` before the
  template layout mounts. So the fonts, the `vii` class and the merchant's
  resolved theme vars all have to be established here, exactly the way
  `vii/layout/vii-layout.tsx` does it.
*/
const fontSerif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-vii-serif",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const fontSans = Jost({
  subsets: ["latin"],
  variable: "--font-vii-sans",
  weight: ["300", "400", "500", "600", "700"],
});

const COPY = {
  coming_soon: {
    overline: "Grand opening",
    heading: "Something beautiful is on its way.",
  },
  maintenance: {
    overline: "Temporarily closed",
    heading: "We'll be back shortly.",
  },
} as const;

/**
 * ViiMaintenancePage — the Skinbar VII maintenance / coming-soon takeover.
 *
 * A full-height navy canvas with one centered editorial column: copper
 * overline, logo (or italic serif wordmark), serif italic headline, the
 * merchant's rich-text note and a single call-to-action. Every foreground
 * token is the light-on-navy variant (`--vii-paper` / `--vii-tan` /
 * `--vii-copper-light`) since the whole screen sits on `--vii-navy`.
 *
 * Entrance motion is pure CSS (`.vii-maintenance-col` stagger in
 * `globals.css`) — this stays a server component so the screen paints with no
 * hydration.
 */
export function ViiMaintenancePage({
  business,
  maintenance,
}: MaintenancePageTemplateProps) {
  const copy = COPY[maintenance.variant];
  const themeVars = resolveThemeVars("vii", business.siteContent?.customFields);

  const businessName = business.name;
  const logoUrl = business.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    businessName,
  );
  const cta = maintenance.cta;

  return (
    <div
      className={`${fontSerif.variable} ${fontSans.variable} vii vii-maintenance`}
      style={{
        fontFamily: "var(--font-sans)",
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(40px, 8vw, 96px) clamp(24px, 6vw, 64px)",
        ...themeVars,
      }}
    >
      {/* noindex while the storefront is dark — rationale (React 19 head
          hoisting) is documented in src/components/maintenance/maintenance-screen.tsx */}
      <meta name="robots" content="noindex" />

      <main
        className="vii-maintenance-col"
        style={{
          width: "100%",
          maxWidth: 640,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "clamp(20px, 3vw, 30px)",
        }}
      >
        <ViiOverline tone="dark" align="center">
          {copy.overline}
        </ViiOverline>

        {/* Wordmark — mirrors the header's logo/italic-serif pattern
            (vii/layout/vii-header.tsx `renderWordmark`), light-on-navy.
            The logo is rendered untinted over the navy. */}
        {logoUrl ? (
          <div style={{ position: "relative", height: 84, width: 220 }}>
            <Image
              src={logoUrl}
              alt={logoAlt}
              fill
              sizes="220px"
              priority
              className="object-contain"
            />
          </div>
        ) : (
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "clamp(22px, 3vw, 30px)",
              fontWeight: 500,
              letterSpacing: "0.02em",
              lineHeight: 1.1,
              color: "var(--vii-paper)",
            }}
          >
            <em>{businessName}</em>
          </span>
        )}

        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: "clamp(30px, 5.2vw, 56px)",
            lineHeight: 1.12,
            letterSpacing: "-0.01em",
            color: "var(--vii-paper)",
            textWrap: "balance",
            margin: 0,
          }}
        >
          {copy.heading}
        </h1>

        {/* The wordmark already carries the name when there's no logo, so the
            separate name line only appears alongside a logo image. */}
        {logoUrl ? (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "var(--vii-tan)",
              margin: 0,
            }}
          >
            {businessName}
          </p>
        ) : null}

        {maintenance.message ? (
          <TiptapRenderer
            content={maintenance.message}
            className="vii-maintenance-body"
          />
        ) : null}

        {cta ? (
          <a
            href={cta.href}
            className="vii-maintenance-cta"
            {...(cta.type === "external"
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {cta.label}
            <ArrowRight aria-hidden="true" style={{ width: 14, height: 14 }} />
          </a>
        ) : null}
      </main>
    </div>
  );
}
