import type { CSSProperties } from "react";
import { Figtree, Josefin_Sans } from "next/font/google";
import Image from "next/image";

import type { MaintenancePageTemplateProps } from "../../types";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { cn } from "~/lib/utils";
import { LaunchCountdown } from "~/components/maintenance/launch-countdown";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "..";
import { OliveButton, OliveLeafMark, OliveRevealGroup } from "../shared";

/*
  This screen renders OUTSIDE `OliveLayout` — `src/app/(storefront)/layout.tsx`
  and `src/app/page.tsx` short-circuit to `t.MaintenancePage` before the
  template layout mounts. So the fonts and the `olive` class have to be
  established here, exactly the way `olive/layout/olive-layout.tsx` does it.
  Olive is a fixed brand (design.md: "no theme presets, no theme.ts, no
  resolveThemeVars"), so unlike vii's maintenance page there is no theme-vars
  call here.
*/
const fontDisplay = Josefin_Sans({
  subsets: ["latin"],
  variable: "--font-olive-display",
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const fontBody = Figtree({
  subsets: ["latin"],
  variable: "--font-olive-body",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

/**
 * Static per-variant heading. Not a template field (this domain declares
 * none, by design) — platform lifecycle copy, same precedent as
 * `vii-maintenance-page.tsx`'s own `COPY` map. No kicker/overline above the
 * heading (craft-floor ban); the state is folded into the sentence itself.
 */
const COPY = {
  maintenance: { heading: "We're tidying the racks." },
  coming_soon: { heading: "Opening day is almost here." },
} as const;

/**
 * OliveMaintenancePage — a white page, a centred `olive-card` with the leaf
 * mark, the wordmark, the maintenance heading/body, and the wordmark
 * tagline ("Detroit · Est. 2020" by default).
 *
 * Owner-editable fields (mirroring vii-maintenance-page.tsx): an optional
 * headline override, an announcement flyer image, a when/where line, and a
 * live countdown to `maintenance.launch`. Every date string arrives
 * pre-formatted from `resolveMaintenanceLaunch` — nothing here formats a
 * date. `LaunchCountdown` is the one client component on the screen
 * (hydration-safe by contract), so this stays a server component.
 */
export function OliveMaintenancePage({
  business,
  maintenance,
}: MaintenancePageTemplateProps) {
  const copy = COPY[maintenance.variant];
  const businessName = business.name;
  const logoUrl = business.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    businessName,
  );
  const cta = maintenance.cta;

  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, ["olive.global.wordmark-tagline"]);
  const tagline = f["olive.global.wordmark-tagline"] ?? "";

  // `null` means "no owner value" → variant default. Overline has no
  // default of its own — olive's craft-floor ban on kickers stays intact
  // unless the owner explicitly types one in.
  const heading = maintenance.headline ?? copy.heading;
  const overline = maintenance.overline;

  const flyerUrl = maintenance.image;
  const launch = maintenance.launch;
  const locationText = maintenance.location;
  const isComingSoon = maintenance.variant === "coming_soon";

  return (
    <div
      className={cn(
        fontDisplay.variable,
        fontBody.variable,
        "olive flex min-h-dvh items-center justify-center",
      )}
      style={{
        backgroundColor: "var(--olive-white)",
        padding: "clamp(24px, 6vw, 64px)",
      }}
    >
      {/* noindex while the storefront is dark — same rationale as
          src/components/maintenance/maintenance-screen.tsx (React 19 hoists
          this to <head> regardless of where it renders). */}
      <meta name="robots" content="noindex" />

      <main className="w-full" style={{ maxWidth: 480 }}>
        <OliveRevealGroup
          className="olive-card flex w-full flex-col items-center gap-5 text-center"
          style={{
            padding: "clamp(32px, 6vw, 56px)",
            boxShadow: "var(--olive-shadow)",
          }}
        >
          {/* No default overline — olive's craft-floor ban on kickers stays
              kicker-free unless the owner explicitly sets one. */}
          {overline ? (
            <span
              className="olive-label olive-reveal-item"
              style={{ "--i": 0 } as CSSProperties}
            >
              {overline}
            </span>
          ) : null}

          <span
            aria-hidden
            className="olive-reveal-item"
            style={{ "--i": 0, color: "var(--olive-leaf)" } as CSSProperties}
          >
            <OliveLeafMark size={24} />
          </span>

          {logoUrl ? (
            <span
              className="olive-reveal-item relative block h-10 w-36"
              style={{ "--i": 1 } as CSSProperties}
            >
              <Image
                src={logoUrl}
                alt={logoAlt}
                fill
                sizes="144px"
                className="object-contain"
                priority
              />
            </span>
          ) : (
            <span
              className="olive-wordmark olive-reveal-item"
              style={{ fontSize: "0.9375rem", "--i": 1 } as CSSProperties}
            >
              {businessName}
            </span>
          )}

          <h1
            className="olive-display olive-reveal-item"
            style={{ margin: 0, "--i": 2 } as CSSProperties}
          >
            {heading}
          </h1>

          {/* Announcement flyer. Intrinsic sizing (`height: auto`) rather than
              `fill`: the owner can upload any aspect ratio and we must not crop
              an image whose whole point is the text printed on it. */}
          {flyerUrl ? (
            <figure
              className="olive-maintenance-flyer olive-reveal-item"
              style={{ "--i": 3 } as CSSProperties}
            >
              <Image
                src={flyerUrl}
                alt={maintenance.headline ?? "Grand opening flyer"}
                width={840}
                height={1050}
                sizes="(max-width: 480px) 100vw, 360px"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </figure>
          ) : null}

          {/* When / where. Both halves are optional, so the middot separator is
              emitted only when there is something on either side of it. */}
          {launch !== null || locationText !== null ? (
            <p
              className="olive-label olive-reveal-item"
              style={{ "--i": 4 } as CSSProperties}
            >
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
            <div
              className="olive-reveal-item"
              style={{ "--i": 4 } as CSSProperties}
            >
              <LaunchCountdown
                targetIso={launch.startAt}
                label={isComingSoon ? "Opening in" : "Back in"}
                pastLabel={isComingSoon ? "Now open" : "We're back"}
                className="olive-maintenance-countdown"
              />
            </div>
          ) : null}

          {maintenance.message ? (
            <div
              className="olive-reveal-item"
              style={{ "--i": 5 } as CSSProperties}
            >
              <TiptapRenderer
                content={maintenance.message}
                className="olive-maintenance-body"
              />
            </div>
          ) : null}

          {cta ? (
            <OliveButton
              variant="primary"
              href={cta.href}
              target={cta.type === "external" ? "_blank" : undefined}
              rel={cta.type === "external" ? "noopener noreferrer" : undefined}
              className="olive-reveal-item"
              style={{ "--i": 6 } as CSSProperties}
            >
              {cta.label}
            </OliveButton>
          ) : null}

          {tagline ? (
            <p
              className="olive-caption olive-reveal-item"
              style={{ margin: 0, "--i": 7 } as CSSProperties}
            >
              {tagline}
            </p>
          ) : null}
        </OliveRevealGroup>
      </main>
    </div>
  );
}
