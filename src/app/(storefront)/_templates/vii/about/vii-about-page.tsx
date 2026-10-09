import type { DefaultAboutPageTemplateProps } from "../../types";
import { navHrefOffFlag } from "~/app/(storefront)/_components/nav/nav-flags";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  getRawCustomFieldString,
  parseTemplateListRows,
} from "~/lib/template-fields";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { ViiContactCtaSection } from "../homepage/vii-contact-cta-section";
import { nonBlank } from "../shared/vii-non-blank";
import { DEFAULT_VII_ABOUT_STEPS, DEFAULT_VII_ABOUT_TEAM } from "./index";
import { ViiAboutBand } from "./vii-about-band";
import { ViiAboutHero } from "./vii-about-hero";
import { ViiAboutMission } from "./vii-about-mission";
import { ViiAboutSteps } from "./vii-about-steps";
import { ViiAboutTeam } from "./vii-about-team";
import { ViiAboutTeamOwner } from "./vii-about-team-owner";

export async function ViiAboutPage({
  business,
}: DefaultAboutPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const { isEnabled } = await getBusinessFlags();

  const f = resolveFields(customFields, [
    // Hero
    "vii.about.hero-image",
    "vii.about.hero-overline",
    "vii.about.hero-heading",
    // Mission
    "vii.about.mission-overline",
    "vii.about.mission-heading",
    "vii.about.mission-heading-accent",
    "vii.about.mission-body",
    // Steps
    "vii.about.steps-overline",
    "vii.about.steps-heading",
    "vii.about.steps-heading-accent",
    "vii.about.steps-intro",
    // Band
    "vii.about.band-image",
    "vii.about.band-label",
    "vii.about.band-statement",
    // Owner spotlight
    "vii.about.owner-overline",
    "vii.about.owner-heading",
    "vii.about.owner-heading-accent",
    "vii.about.owner-role",
    "vii.about.owner-body",
    "vii.about.owner-image",
    // Team grid
    "vii.about.team-overline",
    "vii.about.team-heading",
    "vii.about.team-intro",
    // CTA
    "vii.about.cta-image",
    "vii.about.cta-heading",
    "vii.about.cta-subheading",
    "vii.about.cta-body",
    "vii.about.cta-button-label",
    "vii.about.cta-button-link",
    "vii.about.cta-show-phone",
    "vii.about.cta-show-email",
  ]);

  const parsedSteps = parseTemplateListRows(customFields?.["vii.about.steps"]);
  const steps = parsedSteps.length > 0 ? parsedSteps : DEFAULT_VII_ABOUT_STEPS;

  const parsedTeam = parseTemplateListRows(customFields?.["vii.about.team"]);
  const team = parsedTeam.length > 0 ? parsedTeam : DEFAULT_VII_ABOUT_TEAM;

  // CTA phone/email: Settings → General wins; else the legacy per-template
  // fields (retired 2026-09-25, a read-only fallback — never written or
  // cleared from here). The show-phone/show-email toggles still apply.
  const ctaPhone =
    nonBlank(business.phoneNumber) ??
    nonBlank(getRawCustomFieldString(customFields, "vii.about.cta-phone")) ??
    "";
  const ctaEmail =
    nonBlank(business.supportEmail) ??
    nonBlank(getRawCustomFieldString(customFields, "vii.about.cta-email")) ??
    "";

  // B2.5: hide the closing CTA button when its href names a flag that's
  // off — never swap in another destination.
  const ctaButtonLink = f["vii.about.cta-button-link"] ?? "";
  const ctaButtonLinkFlag = navHrefOffFlag(ctaButtonLink, isEnabled);
  const ctaButtonAllowed =
    ctaButtonLinkFlag === null || isEnabled(ctaButtonLinkFlag);

  return (
    <PageTransition>
      {/* 1. Hero */}
      <ViiAboutHero
        heroImage={f["vii.about.hero-image"] ?? undefined}
        overline={f["vii.about.hero-overline"] ?? ""}
        heading={f["vii.about.hero-heading"] ?? "About"}
      />

      {/* 2. Mission */}
      {isSectionVisible(customFields, "vii", "about.mission") && (
        <ViiAboutMission
          overline={f["vii.about.mission-overline"] ?? ""}
          heading={f["vii.about.mission-heading"] ?? ""}
          headingAccent={f["vii.about.mission-heading-accent"] ?? ""}
          body={f["vii.about.mission-body"] ?? ""}
        />
      )}

      {/* 3. Six-step facial ritual */}
      {isSectionVisible(customFields, "vii", "about.steps") && (
        <ViiAboutSteps
          overline={f["vii.about.steps-overline"] ?? ""}
          heading={f["vii.about.steps-heading"] ?? ""}
          headingAccent={f["vii.about.steps-heading-accent"] ?? ""}
          intro={f["vii.about.steps-intro"] ?? ""}
          steps={steps}
        />
      )}

      {/* 4. Atmospheric brand-statement band */}
      {isSectionVisible(customFields, "vii", "about.band") && (
        <ViiAboutBand
          bandImage={f["vii.about.band-image"] ?? undefined}
          label={f["vii.about.band-label"] ?? ""}
          statement={f["vii.about.band-statement"] ?? ""}
        />
      )}

      {/* 5. Meet the team — owner spotlight */}
      {isSectionVisible(customFields, "vii", "about.owner") && (
        <ViiAboutTeamOwner
          overline={f["vii.about.owner-overline"] ?? ""}
          heading={f["vii.about.owner-heading"] ?? ""}
          headingAccent={f["vii.about.owner-heading-accent"] ?? ""}
          role={f["vii.about.owner-role"] ?? ""}
          body={f["vii.about.owner-body"] ?? ""}
          ownerImage={f["vii.about.owner-image"] ?? undefined}
        />
      )}

      {/* 6. Meet the team — grid */}
      {isSectionVisible(customFields, "vii", "about.team") && (
        <ViiAboutTeam
          overline={f["vii.about.team-overline"] ?? ""}
          heading={f["vii.about.team-heading"] ?? ""}
          intro={f["vii.about.team-intro"] ?? ""}
          members={team}
        />
      )}

      {/* 7. Closing contact CTA */}
      {isSectionVisible(customFields, "vii", "about.cta") && (
        <ViiContactCtaSection
          contactImage={f["vii.about.cta-image"] ?? undefined}
          heading={f["vii.about.cta-heading"] ?? ""}
          subheading={f["vii.about.cta-subheading"] ?? ""}
          body={f["vii.about.cta-body"] ?? ""}
          buttonLabel={
            ctaButtonAllowed ? f["vii.about.cta-button-label"] ?? "" : ""
          }
          buttonHref={ctaButtonLink}
          phone={ctaPhone}
          email={ctaEmail}
          showPhone={f["vii.about.cta-show-phone"] !== "false"}
          showEmail={f["vii.about.cta-show-email"] !== "false"}
          sectionAttrs={sectionGroupAttr("about", "cta")}
          headingFieldKey="vii.about.cta-heading"
          subheadingFieldKey="vii.about.cta-subheading"
          bodyFieldKey="vii.about.cta-body"
          buttonLabelFieldKey="vii.about.cta-button-label"
        />
      )}
    </PageTransition>
  );
}
