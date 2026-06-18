import type { DefaultAboutPageTemplateProps } from "../../types";
import { PageTransition } from "~/components/page-animations";
import { parseTemplateListRows } from "~/lib/template-fields";
import type { TemplateListRow } from "~/lib/template-fields";

import { resolveFields } from "..";
import { ViiContactCtaSection } from "../homepage/vii-contact-cta-section";
import { ViiAboutBand } from "./vii-about-band";
import { ViiAboutHero } from "./vii-about-hero";
import { ViiAboutMission } from "./vii-about-mission";
import { ViiAboutSteps } from "./vii-about-steps";
import { ViiAboutTeam } from "./vii-about-team";
import { ViiAboutTeamOwner } from "./vii-about-team-owner";

// Built-in example facial steps, used when the owner hasn't configured any.
const DEFAULT_STEPS: TemplateListRow[] = [
  {
    _id: "default-step-1",
    image: "",
    title: "Consultation",
    body: "We begin with a one-on-one skin analysis to understand your goals, concerns, and skin type — so every step that follows is tailored to you.",
  },
  {
    _id: "default-step-2",
    image: "",
    title: "Cleanse",
    body: "A deep double-cleanse lifts away makeup, sunscreen, and the day's buildup, leaving a fresh canvas ready to receive treatment.",
  },
  {
    _id: "default-step-3",
    image: "",
    title: "Exfoliate",
    body: "Gentle enzymatic and physical exfoliation sloughs away dull, dead cells to reveal the brighter, smoother skin underneath.",
  },
  {
    _id: "default-step-4",
    image: "",
    title: "Steam & Extract",
    body: "Warm steam softens the skin and opens the pores for careful, hygienic extractions that clear congestion without trauma.",
  },
  {
    _id: "default-step-5",
    image: "",
    title: "Mask & Massage",
    body: "A targeted treatment mask paired with a relaxing facial massage drives nutrients deep while easing tension and boosting circulation.",
  },
  {
    _id: "default-step-6",
    image: "",
    title: "Hydrate & Protect",
    body: "We seal everything in with serums, moisturizer, and SPF — locking in hydration and protecting your renewed glow.",
  },
];

// Built-in example team, used when the owner hasn't configured any members.
const DEFAULT_TEAM: TemplateListRow[] = [
  {
    _id: "default-member-1",
    image: "",
    name: "Maya Brooks",
    role: "Licensed Esthetician",
    bio: "A corrective-skincare specialist with a gentle touch and a love for teaching clients the why behind every product.",
  },
  {
    _id: "default-member-2",
    image: "",
    name: "Devon Carter",
    role: "Esthetician & Waxing Specialist",
    bio: "Known for fast, painless service and a calm, easygoing chair-side manner that puts first-timers at ease.",
  },
  {
    _id: "default-member-3",
    image: "",
    name: "Priya Nair",
    role: "Skin Therapist",
    bio: "Brings a holistic, results-driven approach and a deep knowledge of ingredients to every custom facial.",
  },
];

export function ViiAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

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
    "vii.about.cta-phone",
    "vii.about.cta-email",
  ]);

  const parsedSteps = parseTemplateListRows(customFields?.["vii.about.steps"]);
  const steps = parsedSteps.length > 0 ? parsedSteps : DEFAULT_STEPS;

  const parsedTeam = parseTemplateListRows(customFields?.["vii.about.team"]);
  const team = parsedTeam.length > 0 ? parsedTeam : DEFAULT_TEAM;

  return (
    <PageTransition>
      {/* 1. Hero */}
      <ViiAboutHero
        heroImage={f["vii.about.hero-image"] ?? undefined}
        overline={f["vii.about.hero-overline"] ?? ""}
        heading={f["vii.about.hero-heading"] ?? "About"}
      />

      {/* 2. Mission */}
      <ViiAboutMission
        overline={f["vii.about.mission-overline"] ?? ""}
        heading={f["vii.about.mission-heading"] ?? ""}
        headingAccent={f["vii.about.mission-heading-accent"] ?? ""}
        body={f["vii.about.mission-body"] ?? ""}
      />

      {/* 3. Six-step facial ritual */}
      <ViiAboutSteps
        overline={f["vii.about.steps-overline"] ?? ""}
        heading={f["vii.about.steps-heading"] ?? ""}
        headingAccent={f["vii.about.steps-heading-accent"] ?? ""}
        intro={f["vii.about.steps-intro"] ?? ""}
        steps={steps}
      />

      {/* 4. Atmospheric brand-statement band */}
      <ViiAboutBand
        bandImage={f["vii.about.band-image"] ?? undefined}
        label={f["vii.about.band-label"] ?? ""}
        statement={f["vii.about.band-statement"] ?? ""}
      />

      {/* 5. Meet the team — owner spotlight */}
      <ViiAboutTeamOwner
        overline={f["vii.about.owner-overline"] ?? ""}
        heading={f["vii.about.owner-heading"] ?? ""}
        headingAccent={f["vii.about.owner-heading-accent"] ?? ""}
        role={f["vii.about.owner-role"] ?? ""}
        body={f["vii.about.owner-body"] ?? ""}
        ownerImage={f["vii.about.owner-image"] ?? undefined}
      />

      {/* 6. Meet the team — grid */}
      <ViiAboutTeam
        overline={f["vii.about.team-overline"] ?? ""}
        heading={f["vii.about.team-heading"] ?? ""}
        intro={f["vii.about.team-intro"] ?? ""}
        members={team}
      />

      {/* 7. Closing contact CTA */}
      <ViiContactCtaSection
        contactImage={f["vii.about.cta-image"] ?? undefined}
        heading={f["vii.about.cta-heading"] ?? ""}
        subheading={f["vii.about.cta-subheading"] ?? ""}
        body={f["vii.about.cta-body"] ?? ""}
        buttonLabel={f["vii.about.cta-button-label"] ?? ""}
        buttonHref={f["vii.about.cta-button-link"] ?? ""}
        phone={f["vii.about.cta-phone"] ?? ""}
        email={f["vii.about.cta-email"] ?? ""}
      />
    </PageTransition>
  );
}
