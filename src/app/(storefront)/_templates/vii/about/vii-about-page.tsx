import type { DefaultAboutPageTemplateProps } from "../../types";
import { PageTransition } from "~/components/page-animations";
import { parseTemplateListRows } from "~/lib/template-fields";
import type { TemplateListRow } from "~/lib/template-fields";

import { resolveFields } from "..";
import { ViiContactCtaSection } from "../homepage/vii-contact-cta-section";
import { ViiAboutHero } from "./vii-about-hero";
import { ViiAboutIntro } from "./vii-about-intro";
import { ViiAboutMission } from "./vii-about-mission";
import { ViiAboutPhilosophy } from "./vii-about-philosophy";
import { ViiAboutSteps } from "./vii-about-steps";

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

export function ViiAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    // Hero
    "vii.about.hero-image",
    "vii.about.hero-overline",
    "vii.about.hero-heading",
    // Intro
    "vii.about.intro-overline",
    "vii.about.intro-heading",
    "vii.about.intro-heading-accent",
    "vii.about.intro-body",
    // Mission
    "vii.about.mission-image",
    "vii.about.mission-heading",
    "vii.about.mission-heading-accent",
    "vii.about.mission-body",
    // Philosophy
    "vii.about.philosophy-overline",
    "vii.about.philosophy-heading",
    "vii.about.philosophy-heading-accent",
    "vii.about.philosophy-body",
    "vii.about.philosophy-image",
    // Steps
    "vii.about.steps-overline",
    "vii.about.steps-heading",
    "vii.about.steps-heading-accent",
    "vii.about.steps-intro",
    // CTA
    "vii.about.cta-image",
    "vii.about.cta-heading",
    "vii.about.cta-subheading",
    "vii.about.cta-body",
    "vii.about.cta-phone",
    "vii.about.cta-email",
  ]);

  const parsedSteps = parseTemplateListRows(customFields?.["vii.about.steps"]);
  const steps = parsedSteps.length > 0 ? parsedSteps : DEFAULT_STEPS;

  return (
    <PageTransition>
      {/* 1. Hero */}
      <ViiAboutHero
        heroImage={f["vii.about.hero-image"] ?? undefined}
        overline={f["vii.about.hero-overline"] ?? ""}
        heading={f["vii.about.hero-heading"] ?? "About"}
      />

      {/* 2. Intro */}
      <ViiAboutIntro
        overline={f["vii.about.intro-overline"] ?? ""}
        heading={f["vii.about.intro-heading"] ?? ""}
        headingAccent={f["vii.about.intro-heading-accent"] ?? ""}
        body={f["vii.about.intro-body"] ?? ""}
      />

      {/* 3. Mission */}
      <ViiAboutMission
        missionImage={f["vii.about.mission-image"] ?? undefined}
        heading={f["vii.about.mission-heading"] ?? ""}
        headingAccent={f["vii.about.mission-heading-accent"] ?? ""}
        body={f["vii.about.mission-body"] ?? ""}
      />

      {/* 4. Philosophy */}
      <ViiAboutPhilosophy
        overline={f["vii.about.philosophy-overline"] ?? ""}
        heading={f["vii.about.philosophy-heading"] ?? ""}
        headingAccent={f["vii.about.philosophy-heading-accent"] ?? ""}
        body={f["vii.about.philosophy-body"] ?? ""}
        philosophyImage={f["vii.about.philosophy-image"] ?? undefined}
      />

      {/* 5. Six-step facial ritual */}
      <ViiAboutSteps
        overline={f["vii.about.steps-overline"] ?? ""}
        heading={f["vii.about.steps-heading"] ?? ""}
        headingAccent={f["vii.about.steps-heading-accent"] ?? ""}
        intro={f["vii.about.steps-intro"] ?? ""}
        steps={steps}
      />

      {/* 6. Closing contact CTA */}
      <ViiContactCtaSection
        contactImage={f["vii.about.cta-image"] ?? undefined}
        heading={f["vii.about.cta-heading"] ?? ""}
        subheading={f["vii.about.cta-subheading"] ?? ""}
        body={f["vii.about.cta-body"] ?? ""}
        phone={f["vii.about.cta-phone"] ?? ""}
        email={f["vii.about.cta-email"] ?? ""}
      />
    </PageTransition>
  );
}
