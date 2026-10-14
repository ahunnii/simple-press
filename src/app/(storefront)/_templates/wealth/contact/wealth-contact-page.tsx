import type { DefaultContactPageTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { WealthBlock } from "../shared/wealth-block";
import { WealthReveal } from "../shared/wealth-reveal";
import { WealthContactForm } from "./wealth-contact-form";
import { WealthContactClosing, WealthContactHero } from "./wealth-contact-hero";
import { WealthContactInfo } from "./wealth-contact-info";
import { WealthContactPathways } from "./wealth-contact-pathways";

const PATHWAY_KEYS = [1, 2, 3].map((n) => ({
  title: `wealth.contact.pathway-${n}-title`,
  body: `wealth.contact.pathway-${n}-body`,
  url: `wealth.contact.pathway-${n}-url`,
}));

/**
 * Contact (2026-10-12 redesign): forest hero → three pathway cards →
 * surface block (heading + office note left, form card right) → closing
 * line. The form block hides its form side when the `contactForm` flag is
 * off (the office note, if visible, stays on its own).
 */
export async function WealthContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "wealth.contact.hero-image",
    "wealth.contact.hero-image-alt",
    "wealth.contact.hero-heading",
    "wealth.contact.hero-intro-1",
    "wealth.contact.hero-intro-2",
    ...PATHWAY_KEYS.flatMap((k) => [k.title, k.body, k.url]),
    "wealth.contact.pathway-cta-label",
    "wealth.contact.closing-line",
    "wealth.contact.form-heading",
    "wealth.contact.form-intro",
    "wealth.contact.form-submit-label",
    "wealth.contact.form-success-heading",
    "wealth.contact.form-success-body",
    "wealth.contact.info-address-line1",
    "wealth.contact.info-address-line2",
    "wealth.contact.info-appointment-label",
  ]);

  const pathways = PATHWAY_KEYS.map((k) => ({
    title: f[k.title] ?? "",
    body: f[k.body] ?? "",
    url: f[k.url] ?? "",
    titleKey: k.title,
    bodyKey: k.body,
  }));

  const { isEnabled } = await getBusinessFlags();
  const formEnabled = isEnabled("contactForm");
  const showInfo = isSectionVisible(customFields, "wealth", "contact.info");
  const formHeading = f["wealth.contact.form-heading"] ?? "";
  const formIntro = f["wealth.contact.form-intro"] ?? "";

  const addressLine1 = f["wealth.contact.info-address-line1"] ?? "";
  const addressLine2 = f["wealth.contact.info-address-line2"] ?? "";
  const appointmentLabel = f["wealth.contact.info-appointment-label"] ?? "";
  // The info component renders nothing when all three lines are blank, so
  // gate the surrounding block on content, not on the element's existence.
  const hasInfo =
    showInfo &&
    [addressLine1, addressLine2, appointmentLabel].some((v) => v.trim() !== "");
  const info = hasInfo ? (
    <WealthContactInfo
      addressLine1={addressLine1}
      addressLine2={addressLine2}
      appointmentLabel={appointmentLabel}
    />
  ) : null;

  return (
    <div>
      {/* 1. Hero — not hideable */}
      <WealthContactHero
        heading={f["wealth.contact.hero-heading"] ?? "Contact & Office Hours"}
        intro1={f["wealth.contact.hero-intro-1"] ?? ""}
        intro2={f["wealth.contact.hero-intro-2"] ?? ""}
        image={f["wealth.contact.hero-image"] ?? ""}
        imageAlt={f["wealth.contact.hero-image-alt"] ?? ""}
      />

      {/* 2. Pathways */}
      {isSectionVisible(customFields, "wealth", "contact.pathways") && (
        <WealthContactPathways
          pathways={pathways}
          ctaLabel={f["wealth.contact.pathway-cta-label"] ?? ""}
        />
      )}

      {/* 3. Form block — heading + office note | form card. Never inside a
          reveal (forms are not revealed). */}
      {formEnabled || info ? (
        <WealthBlock
          tone="surface"
          aria-labelledby={
            formEnabled && formHeading.trim()
              ? "wealth-contact-form-h"
              : undefined
          }
          aria-label={
            formEnabled && formHeading.trim() ? undefined : "Get in touch"
          }
        >
          <div
            className={
              formEnabled
                ? "wealth-contact-split"
                : "wealth-contact-split wealth-contact-split--solo"
            }
          >
            <div className="wealth-contact-split__intro">
              {formEnabled ? (
                <WealthReveal
                  className="wealth-contact-split__head"
                  threshold={0}
                  {...sectionGroupAttr("contact", "form")}
                >
                  {formHeading.trim() ? (
                    <h2
                      id="wealth-contact-form-h"
                      className="wealth-h2"
                      {...fieldAttr("wealth.contact.form-heading")}
                    >
                      {formHeading}
                    </h2>
                  ) : null}
                  {formIntro.trim() ? (
                    <p
                      className="wealth-lead"
                      {...fieldAttr("wealth.contact.form-intro")}
                    >
                      {formIntro}
                    </p>
                  ) : null}
                </WealthReveal>
              ) : null}
              {info}
            </div>
            {formEnabled ? (
              <WealthContactForm
                submitLabel={f["wealth.contact.form-submit-label"] ?? "Send"}
                successHeading={
                  f["wealth.contact.form-success-heading"] ?? "Message sent"
                }
                successBody={f["wealth.contact.form-success-body"] ?? ""}
              />
            ) : null}
          </div>
        </WealthBlock>
      ) : null}

      {/* 4. Closing line */}
      <WealthContactClosing line={f["wealth.contact.closing-line"] ?? ""} />
    </div>
  );
}
