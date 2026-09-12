import { Figtree, Josefin_Sans } from "next/font/google";
import Image from "next/image";

import type { MaintenancePageTemplateProps } from "../../types";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "..";
import { OliveButton, OliveLeafMark } from "../shared";

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

  return (
    <div
      className={`${fontDisplay.variable} ${fontBody.variable} olive flex min-h-dvh items-center justify-center`}
      style={{
        backgroundColor: "var(--olive-white)",
        padding: "clamp(24px, 6vw, 64px)",
      }}
    >
      {/* noindex while the storefront is dark — same rationale as
          src/components/maintenance/maintenance-screen.tsx (React 19 hoists
          this to <head> regardless of where it renders). */}
      <meta name="robots" content="noindex" />

      <main
        className="olive-card flex w-full flex-col items-center gap-5 text-center"
        style={{
          maxWidth: 480,
          padding: "clamp(32px, 6vw, 56px)",
          boxShadow: "var(--olive-shadow)",
        }}
      >
        <span aria-hidden style={{ color: "var(--olive-leaf)" }}>
          <OliveLeafMark size={24} />
        </span>

        {logoUrl ? (
          <span className="relative block h-10 w-36">
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
          <span className="olive-wordmark" style={{ fontSize: "0.9375rem" }}>
            {businessName}
          </span>
        )}

        <h1 className="olive-display" style={{ margin: 0 }}>
          {copy.heading}
        </h1>

        {maintenance.message ? (
          <TiptapRenderer
            content={maintenance.message}
            className="olive-caption"
          />
        ) : null}

        {cta ? (
          <OliveButton
            variant="primary"
            href={cta.href}
            target={cta.type === "external" ? "_blank" : undefined}
            rel={cta.type === "external" ? "noopener noreferrer" : undefined}
          >
            {cta.label}
          </OliveButton>
        ) : null}

        {tagline ? (
          <p className="olive-caption" style={{ margin: 0 }}>
            {tagline}
          </p>
        ) : null}
      </main>
    </div>
  );
}
