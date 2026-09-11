import { Jost, PT_Sans, Roboto_Mono, Titillium_Web } from "next/font/google";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import type { MaintenancePageTemplateProps } from "../../types";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { resolveThemeVars } from "~/lib/template-themes";
import { TiptapRenderer } from "~/components/tiptap-renderer";

/*
  Renders OUTSIDE `WealthLayout` — `src/app/(storefront)/layout.tsx` and
  `src/app/page.tsx` short-circuit to `t.MaintenancePage` before the template
  layout mounts, so fonts, the `wealth` scope class, and the merchant's
  resolved theme vars all have to be re-established here exactly the way
  `wealth-layout.tsx` does it (mirroring vii-maintenance-page.tsx's own note).
*/
const fontTitilliumWeb = Titillium_Web({
  subsets: ["latin"],
  variable: "--font-wealth-titillium",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const fontJost = Jost({
  subsets: ["latin"],
  variable: "--font-wealth-jost",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const fontPTSans = PT_Sans({
  subsets: ["latin"],
  variable: "--font-wealth-ptsans",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const fontRobotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-wealth-robotomono",
  weight: ["400", "500"],
  display: "swap",
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
 * WealthMaintenancePage — a quiet, paper-toned takeover distinct from vii's
 * navy canvas: centered DCWF logo, a thin primary-green rule, italic PT Sans
 * headline, and the merchant's rich-text note in Titillium body copy — all
 * on `--wealth-surface-3`, per design.md's "Account / Maintenance" note.
 */
export function WealthMaintenancePage({ business, maintenance }: MaintenancePageTemplateProps) {
  const copy = COPY[maintenance.variant];
  const themeVars = resolveThemeVars("wealth", business.siteContent?.customFields);

  const businessName = business.name;
  const logoUrl = business.siteContent?.logoUrl ?? "/templates/wealth/images/logo.png";
  const logoAlt = resolveLogoAlt(business.siteContent?.logoAltText, businessName);
  const cta = maintenance.cta;

  return (
    <div
      className={`${fontTitilliumWeb.variable} ${fontJost.variable} ${fontPTSans.variable} ${fontRobotoMono.variable} wealth`}
      style={{
        fontFamily: "var(--font-wealth-body)",
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--wealth-surface-3)",
        padding: "clamp(40px, 8vw, 96px) clamp(24px, 6vw, 64px)",
        ...themeVars,
      }}
    >
      {/* noindex while the storefront is dark, matching vii-maintenance-page.tsx */}
      <meta name="robots" content="noindex" />

      <main
        style={{
          width: "100%",
          maxWidth: 560,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 24,
        }}
      >
        <div style={{ position: "relative", height: 64, width: 200 }}>
          <Image src={logoUrl} alt={logoAlt} fill sizes="200px" priority className="object-contain" />
        </div>

        {/* Thin primary-green rule */}
        <div aria-hidden="true" style={{ width: 60, height: 2, background: "var(--wealth-primary)" }} />

        <p
          style={{
            fontFamily: "var(--font-wealth-mono)",
            fontSize: 13,
            fontWeight: 400,
            letterSpacing: "1.9px",
            textTransform: "uppercase",
            color: "var(--wealth-eyebrow)",
            margin: 0,
          }}
        >
          {copy.overline}
        </p>

        <h1
          style={{
            fontFamily: "var(--font-wealth-sub)",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: "clamp(26px, 4.5vw, 40px)",
            lineHeight: 1.3,
            letterSpacing: "0.21px",
            color: "var(--wealth-ink)",
            textWrap: "balance",
            margin: 0,
          }}
        >
          {copy.heading}
        </h1>

        {maintenance.message ? (
          <div
            style={{
              fontFamily: "var(--font-wealth-body)",
              fontSize: 17,
              lineHeight: "25.5px",
              color: "var(--wealth-ink)",
            }}
          >
            <TiptapRenderer content={maintenance.message} />
          </div>
        ) : null}

        {cta ? (
          <a
            href={cta.href}
            className="wealth-btn-mono wealth-btn-ledge wealth-btn-ledge--accent"
            {...(cta.type === "external" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {cta.label}
            <ArrowRight aria-hidden="true" style={{ width: 14, height: 14 }} />
          </a>
        ) : null}
      </main>
    </div>
  );
}
