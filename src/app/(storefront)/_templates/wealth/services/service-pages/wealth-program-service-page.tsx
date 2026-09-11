/**
 * `wealth-program` — hero + centered copy + outlined CTA service detail
 * page, seeded with the real "Worker-Owned Detroit" program page
 * (design.md → "wealth-program service variant").
 *
 * Fields live on `Service.customFields`, edited at `/admin/services/[id]` —
 * NOT the visual editor (there is no `sections.ts` entry for a service
 * detail page), so this file has no `sectionGroupAttr`/`fieldAttr`/
 * `isSectionVisible` calls. Mirrors vii's and pink's per-service-template
 * pages (see `vii-ledger-service-page.tsx`, `pink-table-service-page.tsx`).
 *
 * NOTE / QA follow-up: the real Worker-Owned Detroit program page URL was
 * not available at build time (see fields.ts) — `cta-url` defaults to
 * `/contact` until an owner sets the real link.
 */
import Image from "next/image";

import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";

import { WealthH1 } from "../../shared/wealth-h1";
import { WealthLedgeButton } from "../../shared/wealth-ledge-button";
import { WealthLink } from "../../shared/wealth-link";
import { WealthReveal } from "../../shared/wealth-reveal";
import { WealthSection } from "../../shared/wealth-section";
import { resolveWealthProgramFields } from "./fields";

export function WealthProgramServicePage({
  business,
  service,
}: ServiceTemplateProps) {
  const f = resolveWealthProgramFields(service.customFields, [
    "wealth-program.hero-image",
    "wealth-program.hero-alt",
    "wealth-program.heading",
    "wealth-program.paragraph-1",
    "wealth-program.paragraph-2",
    "wealth-program.paragraph-3",
    "wealth-program.cta-label",
    "wealth-program.cta-url",
    "wealth-program.show-social",
    "wealth-program.secondary-cta-label",
    "wealth-program.secondary-cta-url",
  ]);

  const heroImage =
    f["wealth-program.hero-image"] ?? "/templates/wealth/images/program-hero.jpg";
  const showSocial = f["wealth-program.show-social"] !== "false";
  const hasSecondaryCta =
    !!f["wealth-program.secondary-cta-label"] &&
    !!f["wealth-program.secondary-cta-url"];

  const socialLinks = business.siteContent?.socialLinks as
    | { facebook?: string; instagram?: string }
    | undefined;
  const hasAnySocial = !!(socialLinks?.facebook ?? socialLinks?.instagram);

  return (
    <article>
      {/* 1. Full-width hero image */}
      <WealthReveal>
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16 / 9",
            maxHeight: "70vh",
            overflow: "hidden",
            background: "var(--wealth-surface)",
          }}
        >
          <Image
            src={heroImage}
            alt={f["wealth-program.hero-alt"] ?? ""}
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
        </div>
      </WealthReveal>

      {/* 2. Centered heading + copy + CTA */}
      <WealthSection className="text-center">
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <WealthH1 className="mx-auto">
            {f["wealth-program.heading"] ?? service.name}
          </WealthH1>

          <div
            style={{
              marginTop: 24,
              display: "flex",
              flexDirection: "column",
              gap: "1em",
              textAlign: "left",
            }}
          >
            {f["wealth-program.paragraph-1"] && (
              <p style={{ lineHeight: 1.75, margin: 0 }}>
                {f["wealth-program.paragraph-1"]}
              </p>
            )}
            {f["wealth-program.paragraph-2"] && (
              <p style={{ lineHeight: 1.75, margin: 0 }}>
                {f["wealth-program.paragraph-2"]}
              </p>
            )}
            {f["wealth-program.paragraph-3"] && (
              <p style={{ lineHeight: 1.75, margin: 0 }}>
                {f["wealth-program.paragraph-3"]}
              </p>
            )}
          </div>

          {f["wealth-program.cta-label"] && (
            <div style={{ marginTop: 32 }}>
              <WealthLedgeButton
                href={f["wealth-program.cta-url"] ?? "/contact"}
                variant="outline"
              >
                {f["wealth-program.cta-label"]}
              </WealthLedgeButton>
            </div>
          )}
        </div>
      </WealthSection>

      {/* 3. Optional social row + secondary CTA */}
      {((showSocial && hasAnySocial) || hasSecondaryCta) && (
        <WealthSection className="text-center" reveal={false}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            {showSocial && hasAnySocial && (
              <div style={{ display: "flex", gap: "16px" }}>
                {socialLinks?.facebook ? (
                  <a
                    href={socialLinks.facebook}
                    aria-label="Facebook"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--wealth-ink)" }}
                  >
                    <FacebookIcon className="h-5 w-5" />
                  </a>
                ) : null}
                {socialLinks?.instagram ? (
                  <a
                    href={socialLinks.instagram}
                    aria-label="Instagram"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--wealth-ink)" }}
                  >
                    <InstagramIcon className="h-5 w-5" />
                  </a>
                ) : null}
              </div>
            )}
            {hasSecondaryCta && (
              <WealthLink href={f["wealth-program.secondary-cta-url"] ?? "/contact"}>
                {f["wealth-program.secondary-cta-label"]}
              </WealthLink>
            )}
          </div>
        </WealthSection>
      )}
    </article>
  );
}
