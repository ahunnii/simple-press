import { Jost, PT_Sans, Roboto_Mono, Titillium_Web } from "next/font/google";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import type { MaintenancePageTemplateProps } from "../../types";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { resolveThemeVars } from "~/lib/template-themes";
import { cn } from "~/lib/utils";
import { LaunchCountdown } from "~/components/maintenance/launch-countdown";
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
 *
 * Owner-editable fields (mirroring vii-maintenance-page.tsx): an optional
 * overline/headline override, an announcement flyer image, a when/where
 * line, and a live countdown to `maintenance.launch`. Every date string
 * arrives pre-formatted from `resolveMaintenanceLaunch` — nothing here
 * formats a date. `LaunchCountdown` is the one client component on the
 * screen (hydration-safe by contract), so this stays a server component.
 */
export function WealthMaintenancePage({
  business,
  maintenance,
}: MaintenancePageTemplateProps) {
  const copy = COPY[maintenance.variant];
  const themeVars = resolveThemeVars(
    "wealth",
    business.siteContent?.customFields,
  );

  const businessName = business.name;
  const logoUrl =
    business.siteContent?.logoUrl ?? "/templates/wealth/images/logo.png";
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    businessName,
  );
  const cta = maintenance.cta;

  // Owner-authored values win; `null` means "no owner value" → variant default.
  const overline = maintenance.overline ?? copy.overline;
  const heading = maintenance.headline ?? copy.heading;

  const flyerUrl = maintenance.image;
  const launch = maintenance.launch;
  const locationText = maintenance.location;
  const isComingSoon = maintenance.variant === "coming_soon";

  return (
    <div
      className={cn(
        fontTitilliumWeb.variable,
        fontJost.variable,
        fontPTSans.variable,
        fontRobotoMono.variable,
        "wealth",
      )}
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
          {overline}
        </p>

        <div style={{ position: "relative", height: 64, width: 200 }}>
          <Image
            src={logoUrl}
            alt={logoAlt}
            fill
            sizes="200px"
            priority
            className="object-contain"
          />
        </div>

        {/* Thin primary-green rule */}
        <div
          aria-hidden="true"
          style={{ width: 60, height: 2, background: "var(--wealth-primary)" }}
        />

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
          {heading}
        </h1>

        {/* Announcement flyer. Intrinsic sizing (`height: auto`) rather than
            `fill`: the owner can upload any aspect ratio and we must not crop
            an image whose whole point is the text printed on it. */}
        {flyerUrl ? (
          <figure className="wealth-maintenance-flyer">
            <Image
              src={flyerUrl}
              alt={maintenance.headline ?? "Grand opening flyer"}
              width={840}
              height={1050}
              sizes="(max-width: 480px) 100vw, 420px"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </figure>
        ) : null}

        {/* When / where. Both halves are optional, so the middot separator is
            emitted only when there is something on either side of it. */}
        {launch !== null || locationText !== null ? (
          <p className="wealth-maintenance-when">
            {launch ? (
              <time dateTime={launch.dateTimeAttr}>
                {launch.dateText}
                {launch.timeText ? ` · ${launch.timeText}` : ""}
              </time>
            ) : null}
            {launch && locationText ? " · " : null}
            {locationText ? <span>{locationText}</span> : null}
          </p>
        ) : null}

        {launch ? (
          <LaunchCountdown
            targetIso={launch.startAt}
            label={isComingSoon ? "Opening in" : "Back in"}
            pastLabel={isComingSoon ? "Now open" : "We're back"}
            className="wealth-maintenance-countdown"
          />
        ) : null}

        {maintenance.message ? (
          <TiptapRenderer
            content={maintenance.message}
            className="wealth-maintenance-body"
          />
        ) : null}

        {cta ? (
          <a
            href={cta.href}
            className="wealth-btn-mono wealth-btn-ledge wealth-btn-ledge--accent"
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
